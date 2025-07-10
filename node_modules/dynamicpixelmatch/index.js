const pixelmatch = require('pixelmatch');

function dynamicPixelmatch(img1, img2, output, width, height, options, excluded = []) {
    const excludedPixelAreas = excluded.map(calculatePixelsFromPercents({ width, height }));
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const pos = (y * width + x) * 4;

            if (excludedPixelAreas.length) {
                const isIgnoredPixel = excludedPixelAreas.some(area => {
                    return x >= area.x1 && y >= area.y1 && x <= area.x2 && y <= area.y2;
                });
                if (isIgnoredPixel) {
                    /**
                     * Draw ignored pixel with blue: #4A90E2
                     */
                    drawPixel(img1, pos, 74, 144, 226);
                    drawPixel(img2, pos, 74, 144, 226);
                    continue;
                }
            }
        }
    }

    return pixelmatch(img1, img2, output, width, height, options);
}

function drawPixel(output, pos, r, g, b) {
    output[pos + 0] = r;
    output[pos + 1] = g;
    output[pos + 2] = b;
    output[pos + 3] = 255;
}

function calculatePixelsFromPercents({ width, height }) {
    return ({ x1, y1, x2, y2 }) => ({
        x1: Math.ceil(x1 * width / 100),
        y1: Math.ceil(y1 * height / 100),
        x2: Math.ceil(x2 * width / 100),
        y2: Math.ceil(y2 * height / 100),
    });
}

module.exports = dynamicPixelmatch;
