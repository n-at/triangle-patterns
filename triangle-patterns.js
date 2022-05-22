import seedrandom from 'seedrandom';
import Delaunator from "delaunator";
import chroma from 'chroma-js';

const ColorStyleDefault = 'default';
const ColorStyleJitter = 'jitter';
const ColorStyleShadows = 'shadows';
const ColorStyleShining = 'shining';
const ColorStyleSaturate = 'saturate';

const RandomizePaletteNone = 'none';
const RandomizePaletteX = 'x';
const RandomizePaletteY = 'y';
const RandomizePaletteBoth = 'both';

const defaultConfig = {
    //size of initial points mesh (horizontal and vertical)
    meshStepX: 35,
    meshStepY: 35,

    //random seed (same values gives same results)
    seed: 123456,

    //max point position deviation, percent
    variance: 0.05,

    //mesh mode colors
    meshColorStroke: 'black',
    meshColorFill: 'white',

    //color palettes: arrays of colors for horizontal and vertical scales
    //default ColorBrewer colors available: https://github.com/gka/chroma.js/blob/main/src/colors/colorbrewer.js
    //use them with TrianglePattern.colors property, for example:
    //colorsX: TrianglePattern.colors.PuBuGn
    colorsX: chroma.brewer.Oranges,
    colorsY: chroma.brewer.Purples,

    //randomize colors on x, y or both palettes
    colorRandomizePalette: RandomizePaletteNone,

    //mix ratio between horizontal and vertical scales
    colorMixRatio: 0.5,

    //use some color styles from TrianglePattern.styles property
    colorStyle: ColorStyleDefault,
    colorStyleJitterIntensity: 0.15,
    colorStyleShadowsIntensity: 0.85,
    colorStyleShiningIntensity: 0.85,
    colorStyleSaturateIntensity: 0.85,

    colorMode: 'lrgb',
};

window.TrianglePattern = function(patternConfig) {
    const config = Object.assign({}, defaultConfig, patternConfig);
    const rng = seedrandom(config.seed);

    if (!config.width) {
        throw new Error("width required");
    }
    if (!config.height) {
        throw new Error("height required");
    }

    const points = generatePoints(config, rng);
    const triangles = generateTriangles(points);
    const coloredTriangles = colorTriangles(config, rng, triangles);

    return {
        draw(canvasCtx) {
            for (let triangle of coloredTriangles) {
                canvasCtx.fillStyle = triangle.color;
                canvasCtx.strokeStyle = triangle.color;
                drawTriangleOnCanvas(canvasCtx, triangle);
            }
        },

        drawMesh(canvasCtx) {
            canvasCtx.fillStyle = config.meshColorFill;
            canvasCtx.strokeStyle = config.meshColorStroke;

            for (let triangle of triangles) {
                drawTriangleOnCanvas(canvasCtx, triangle);
            }
        },

        svg() {
            const polygons = [];

            for (let triangle of coloredTriangles) {
                const p0 = `${triangle.p0.x},${triangle.p0.y}`;
                const p1 = `${triangle.p1.x},${triangle.p1.y}`;
                const p2 = `${triangle.p2.x},${triangle.p2.y}`;
                const points = `${p0} ${p1} ${p2}`;
                polygons.push(`<polygon points="${points}" fill="${triangle.color}" stroke="${triangle.color}" />`);
            }

            return `<svg viewBox="0 0 ${config.width} ${config.height}" xmlns="http://www.w3.org/2000/svg">${polygons.join('')}</svg>`;
        },
    };
};

window.TrianglePattern.colors = chroma.brewer;

window.TrianglePattern.styles = {
    default: ColorStyleDefault,
    jitter: ColorStyleJitter,
    shadows: ColorStyleShadows,
    shining: ColorStyleShining,
    saturate: ColorStyleSaturate,
};

window.TrianglePattern.randomizePalette = {
    none: RandomizePaletteNone,
    x: RandomizePaletteX,
    y: RandomizePaletteY,
    both: RandomizePaletteBoth,
};

///////////////////////////////////////////////////////////////////////////////

function generatePoints(config, rng) {
    const points = [];

    for (let x = config.meshStepX; x < config.width; x += config.meshStepX) {
        for (let y = config.meshStepY; y < config.height; y += config.meshStepY) {
            points.push({x, y});
        }
    }

    for (let pointIdx = 0; pointIdx < points.length; pointIdx++) {
        let newX = points[pointIdx].x + Math.floor(config.variance * (rng() - 0.5) * config.width);
        let newY = points[pointIdx].y + Math.floor(config.variance * (rng() - 0.5) * config.height);
        points[pointIdx] = {
            x: Math.min(config.width, Math.max(0, newX)),
            y: Math.min(config.height, Math.max(0, newY)),
        };
    }

    for (let x = config.meshStepX; x < config.width; x += config.meshStepX) {
        points.push({
            x,
            y: 0,
        });
        points.push({
            x,
            y: config.height,
        });
    }
    for (let y = config.meshStepY; y < config.height; y += config.meshStepY) {
        points.push({
            x: 0,
            y,
        });
        points.push({
            x: config.width,
            y,
        });
    }
    points.push({
        x: 0,
        y: 0,
    });
    points.push({
        x: 0,
        y: config.height,
    });
    points.push({
        x: config.width,
        y: 0,
    });
    points.push({
        x: config.width,
        y: config.height,
    });

    return points;
}

function generateTriangles(points) {
    const coordinates = [];
    for (let point of points) {
        coordinates.push(point.x);
        coordinates.push(point.y);
    }

    const delaunay = new Delaunator(coordinates);

    const triangles = [];
    for (let pointIdx = 0; pointIdx < delaunay.triangles.length; pointIdx += 3) {
        triangles.push({
            p0: points[delaunay.triangles[pointIdx]],
            p1: points[delaunay.triangles[pointIdx+1]],
            p2: points[delaunay.triangles[pointIdx+2]],
        });
    }

    return triangles;
}

function colorTriangles(config, rng, triangles) {
    const colorsX = (config.colorRandomizePalette === RandomizePaletteX || config.colorRandomizePalette === RandomizePaletteBoth) ? randomizePalette(config.colorsX, rng) : config.colorsX;
    const scaleX = chroma.scale(colorsX)
        .mode(config.colorMode)
        .domain([0, config.width]);

    const colorsY = (config.colorRandomizePalette === RandomizePaletteY || config.colorRandomizePalette === RandomizePaletteBoth) ? randomizePalette(config.colorsY, rng) : config.colorsY;
    const scaleY = chroma.scale(colorsY)
        .mode(config.colorMode)
        .domain([0, config.height]);

    const coloredTriangles = [];

    for (let currentTriangle of triangles) {
        const triangle = Object.assign({}, currentTriangle);

        const centroidX = (triangle.p0.x + triangle.p1.x + triangle.p2.x) / 3.0;
        const centroidY = (triangle.p0.y + triangle.p1.y + triangle.p2.y) / 3.0;

        const colorX = calculateColor(config, rng, scaleX, centroidX);
        const colorY = calculateColor(config, rng, scaleY, centroidY);
        const color = chroma.mix(colorX, colorY, config.colorMixRatio, config.colorMode);

        triangle.color = color.hex();

        coloredTriangles.push(triangle);
    }

    return coloredTriangles;
}

function calculateColor(config, rng, colorScale, value) {
    switch (config.colorStyle) {
        case ColorStyleJitter: {
            const offset = (rng() - 0.5) * config.colorStyleJitterIntensity;
            return colorScale(value + value * offset);
        }

        case ColorStyleShadows: {
            const color = colorScale(value);
            return color.darken(config.colorStyleShadowsIntensity * rng());
        }

        case ColorStyleShining: {
            const color = colorScale(value);
            return color.brighten(config.colorStyleShiningIntensity * rng());
        }

        case ColorStyleSaturate: {
            const color = colorScale(value);
            return color.saturate(config.colorStyleSaturateIntensity * rng());
        }

        default:
            return colorScale(value);
    }
}

function randomizePalette(colors, rng) {
    const randomizedColors = [];
    for (let color of colors) {
        randomizedColors.push(color);
    }
    for (let i = 0; i < colors.length; i++) {
        const idxA = Math.floor(rng() * colors.length);
        const idxB = Math.floor(rng() * colors.length);
        const t = randomizedColors[idxA];
        randomizedColors[idxA] = randomizedColors[idxB];
        randomizedColors[idxB] = t;
    }

    return randomizedColors;
}

function drawTriangleOnCanvas(ctx, triangle) {
    ctx.beginPath();
    ctx.moveTo(triangle.p0.x, triangle.p0.y);
    ctx.lineTo(triangle.p1.x, triangle.p1.y);
    ctx.lineTo(triangle.p2.x, triangle.p2.y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
}
