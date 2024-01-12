import { SimulationNodeDatum } from 'd3';

export interface Node extends SimulationNodeDatum {
  id: string;
  name: string;
  value: number;
}

export const data: Node[] = [
  { id: 'Myriel', name: 'test', value: 101 },
  { id: 'Anne', name: 'test2', value: 105 },
  { id: 'Gabriel', name: 'test3', value: 1 },
];
