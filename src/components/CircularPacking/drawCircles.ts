import { ScalePower, extent, range, scaleLinear } from 'd3';

import { Node } from './data';

export const drawCircles = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  nodes: Node[],
  sizeScale: ScalePower<number, number, never>,
) => {
  context.clearRect(0, 0, width, height);

  const valueRange = extent(nodes, (node) => node.value);

  if (!valueRange[0] || !valueRange[1]) {
    return;
  }

  const colorScale = scaleLinear<string>()
    .domain(range(valueRange[0], valueRange[1], (valueRange[1] - valueRange[0]) / 5))
    .range([
      'rgba(255,0,54,0.5)',
      'rgba(255,0,54,0.7)',
      'rgba(255,0,54,0.8)',
      'rgba(255,0,54,0.9)',
      '#ff0036',
    ]);

  const textColorScale = scaleLinear<string>()
    .domain(range(valueRange[0], valueRange[1], (valueRange[1] - valueRange[0]) / 3))
    .range([
      'rgba(255,255,255,0.5)',
      'rgba(255,255,255,0.7)',
      'rgba(255,255,255,0.85)',
      'rgba(255,255,255,0.95)',
      '#fff',
    ]);

  // Draw the nodes
  nodes.forEach((node) => {
    if (!node.x || !node.y) {
      return;
    }

    context.beginPath();
    const radius = sizeScale(node.value);
    context.arc(node.x, node.y, radius - 4, 0, 2 * Math.PI);
    context.fillStyle = colorScale(node.value);
    context.fill();
    context.lineWidth = 3;

    context.strokeStyle = 'white';
    context.stroke();

    context.fillStyle = textColorScale(node.value);
    const fontSize = Math.min(radius / 2);
    context.font = `${fontSize}px 'Open Sans', sans-serif`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(node.name, node.x, node.y);
  });
};
