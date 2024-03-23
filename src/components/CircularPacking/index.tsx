import * as d3 from 'd3';
import { extent, scaleSqrt } from 'd3';
import React from 'react';
import { useEffect, useRef } from 'react';

import { Node } from './data';
import { drawCircles } from './drawCircles';

const BUBBLE_MIN_SIZE = 30;
const BUBBLE_MAX_SIZE = 150;

type CirclePackingProps = {
  data: Node[];
};

export const CirclePacking = ({ data }: CirclePackingProps) => {
  // The force simulation mutates nodes, so create a copy first
  // Node positions are initialized by d3
  const nodes: Node[] = data.map((d) => ({ ...d }));

  const dpi = window.devicePixelRatio;
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [min, max] = extent(nodes.map((d) => d.value)) as [number, number];
  const sizeScale = scaleSqrt().domain([min, max]).range([BUBBLE_MIN_SIZE, BUBBLE_MAX_SIZE]);

  useEffect(() => {
    // set dimension of the canvas element
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!context || !canvas) {
      return;
    }

    const container = canvas.parentNode as HTMLElement;
    canvas.width = container.clientWidth * dpi;
    canvas.height = container.clientHeight * dpi;

    // run d3-force to find the position of nodes on the canvas
    d3.forceSimulation(nodes)
      .force(
        'collide',
        // @ts-ignore
        d3.forceCollide().radius((node) => sizeScale(node.value) + 1),
      )
      .force(
        'charge',
        // @ts-ignore.
        d3.forceManyBody().strength((node) => 80 * Math.sqrt(sizeScale(node.value))),
      )
      .force('center', d3.forceCenter(canvas.width / 2, canvas.height / 2))
      .force('charge', d3.forceY(0).strength(0.05))

      // at each iteration of the simulation, draw the network diagram with the new node positions
      .on('tick', () => {
        nodes.forEach((node) => {
          node.x = Math.max(
            sizeScale(node.value),
            Math.min(canvas.width - sizeScale(node.value), node.x || 0),
          );
          node.y = Math.max(
            sizeScale(node.value),
            Math.min(canvas.height - sizeScale(node.value), node.y || 0),
          );
        });

        drawCircles(context, canvas.width, canvas.height, nodes, sizeScale);
      });
  }, [dpi, nodes, sizeScale]);

  return <canvas ref={canvasRef} />;
};
