<template>
  <div class="graph-flex-root">
    <aside class="period-list">
      <h2 class="period-list-title">Périodes</h2>
      <ul class="period-list-items">
        <li
          v-for="period in periodList"
          :key="period.id"
          class="period-item"
          draggable="true"
          @dragstart="handleDragStart(period)"
        >
          {{ period.label.fr || period.label }}
        </li>
      </ul>
    </aside>
    <section
      class="graph-area"
      :class="{ 'drag-over': isDragOver }"
      @dragover.prevent="handleDragOver"
      @dragleave="handleDragLeave"
      @drop="handleDrop"
    >
      <svg ref="svgRef"></svg>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import * as d3 from 'd3';
import type { D3GraphNode, D3GraphLink, GraphPeriod, GraphLink } from '../types/graph';
import { GraphViewService, DatabaseQueryService } from '../services';

const graphViewService = GraphViewService.getInstance();
const dbService = DatabaseQueryService.getInstance();
const svgRef = ref<SVGSVGElement | null>(null);
const simulation = ref<d3.Simulation<D3GraphNode, D3GraphLink> | null>(null);
const width = ref(800);
const height = ref(600);
const periodList = ref<any[]>([]);
const draggedPeriodId = ref<string | null>(null);
const isDragOver = ref(false);

// Conversion des données du service en données D3
function toD3Nodes(periods: GraphPeriod[]): D3GraphNode[] {
  return periods.map(p => ({
    id: p.id,
    label: p.label,
    description: p.description,
    x: p.x,
    y: p.y,
    fx: p.fx,
    fy: p.fy,
    vx: p.vx,
    vy: p.vy,
    isMainEon: p.isMainEon
  }));
}

function toD3Links(links: GraphLink[], nodes: D3GraphNode[]): D3GraphLink[] {
  return links.map(l => ({
    source: nodes.find(n => n.id === l.source) || l.source,
    target: nodes.find(n => n.id === l.target) || l.target,
    type: l.type
  }));
}

const initSimulation = () => {
  if (!svgRef.value) return;

  // Nettoyer le SVG existant
  d3.select(svgRef.value).selectAll('*').remove();

  // Créer le conteneur SVG
  const svg = d3.select(svgRef.value)
    .attr('width', width.value)
    .attr('height', height.value);

  // Créer le groupe principal pour le zoom/pan
  const zoomGroup = svg.append('g').attr('class', 'zoom-group');

  // Créer le groupe pour les liens
  const linkGroup = zoomGroup.append('g')
    .attr('class', 'links');

  // Créer le groupe pour les nœuds
  const nodeGroup = zoomGroup.append('g')
    .attr('class', 'nodes');

  // Ajout du zoom/pan D3
  svg.call(
    d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 5])
      .on('zoom', (event) => {
        zoomGroup.attr('transform', event.transform);
      })
  );

  // Initialiser la simulation
  simulation.value = d3.forceSimulation<D3GraphNode>()
    .force('link', d3.forceLink<D3GraphNode, D3GraphLink>()
      .id(d => d.id)
      .distance(100))
    .force('charge', d3.forceManyBody().strength(-300))
    .force('center', d3.forceCenter(width.value / 2, height.value / 2))
    .force('collision', d3.forceCollide().radius(50));

  // Mettre à jour la simulation quand les données changent
  watch(() => [graphViewService.getPeriods(), graphViewService.getLinks()], ([periods, links]) => {
    console.log('[GraphView] periods:', periods, 'links:', links);
    if (!simulation.value) return;
    const nodes: D3GraphNode[] = toD3Nodes(periods as GraphPeriod[]);
    const d3Links: D3GraphLink[] = toD3Links(links as GraphLink[], nodes);

    // Mettre à jour les liens
    const linkElements = linkGroup.selectAll<SVGLineElement, D3GraphLink>('line')
      .data(d3Links, d => `${typeof d.source === 'string' ? d.source : d.source.id}-${typeof d.target === 'string' ? d.target : d.target.id}`);

    linkElements.exit().remove();
    linkElements.enter()
      .append('line')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', 2)
      .merge(linkElements);

    // Mettre à jour les nœuds
    const nodeElements = nodeGroup.selectAll<SVGGElement, D3GraphNode>('g')
      .data(nodes, d => d.id);

    nodeElements.exit().remove();
    const nodeEnter = nodeElements.enter()
      .append('g')
      .attr('class', 'node');

    nodeEnter.append('circle')
      .attr('r', 20)
      .attr('fill', '#69c0ff')
      .attr('stroke', '#1890ff')
      .attr('stroke-width', 2);

    nodeEnter.append('text')
      .attr('dy', '.35em')
      .attr('text-anchor', 'middle')
      .text(d => d.label)
      .attr('fill', '#fff')
      .style('font-size', '12px');

    const nodeUpdate = nodeElements.merge(nodeEnter);
    nodeUpdate.select('circle')
      .attr('fill', d => d.isMainEon ? '#ff4d4f' : '#69c0ff');

    // Ajouter le drag après la création des nœuds
    nodeUpdate.call(d3.drag<SVGGElement, D3GraphNode>()
      .on('start', dragstarted)
      .on('drag', dragged)
      .on('end', dragended));

    // Mettre à jour la simulation
    simulation.value
      .nodes(nodes)
      .on('tick', () => {
        linkElements
          .attr('x1', d => typeof d.source === 'string' ? 0 : d.source.x || 0)
          .attr('y1', d => typeof d.source === 'string' ? 0 : d.source.y || 0)
          .attr('x2', d => typeof d.target === 'string' ? 0 : d.target.x || 0)
          .attr('y2', d => typeof d.target === 'string' ? 0 : d.target.y || 0);

        nodeElements
          .attr('transform', d => `translate(${d.x || 0},${d.y || 0})`);
      });

    (simulation.value.force('link') as d3.ForceLink<D3GraphNode, D3GraphLink>)
      .links(d3Links);
  }, { deep: true });
};

const dragstarted = (event: d3.D3DragEvent<SVGGElement, D3GraphNode, D3GraphNode>, d: D3GraphNode) => {
  if (!simulation.value) return;
  event.sourceEvent.stopPropagation();
  d.fx = d.x;
  d.fy = d.y;
};

const dragged = (event: d3.D3DragEvent<SVGGElement, D3GraphNode, D3GraphNode>, d: D3GraphNode) => {
  if (!simulation.value) return;
  d.fx = event.x;
  d.fy = event.y;
};

const dragended = (event: d3.D3DragEvent<SVGGElement, D3GraphNode, D3GraphNode>, d: D3GraphNode) => {
  if (!simulation.value) return;
  d.fx = undefined;
  d.fy = undefined;
};

onMounted(async () => {
  periodList.value = await dbService.getAllPeriods();
  initSimulation();
});

function handleDragStart(period: any) {
  draggedPeriodId.value = period.id;
}

function handleDragOver() {
  isDragOver.value = true;
}

function handleDragLeave() {
  isDragOver.value = false;
}

async function handleDrop() {
  isDragOver.value = false;
  if (draggedPeriodId.value) {
    await graphViewService.addPeriodToGraph(draggedPeriodId.value);
    draggedPeriodId.value = null;
  }
}
</script>

<style scoped>
.graph-flex-root {
  display: flex;
  flex-direction: row;
  height: 100%;
  min-height: 0;
  background: var(--color-background);
}
.period-list {
  width: 300px;
  background: var(--color-surface);
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  padding: var(--spacing-md);
  min-width: 0;
}
.period-list-title {
  font-size: var(--font-size-lg);
  font-weight: 600;
  margin-bottom: var(--spacing-md);
  color: var(--color-text);
}
.period-list-items {
  list-style: none;
  margin: 0;
  padding: 0;
  flex: 1;
  overflow-y: auto;
}
.period-item {
  padding: 10px 0;
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text);
  cursor: grab;
  font-size: var(--font-size-base);
  transition: background 0.2s;
}
.period-item:hover {
  background: var(--color-surface-hover);
}
.graph-area {
  flex: 1;
  min-width: 0;
  min-height: 0;
  height: 100%;
  display: flex;
  align-items: stretch;
  justify-content: stretch;
  background: var(--color-background);
  border-radius: var(--radius-lg);
  overflow: hidden;
  border: 2px solid var(--color-border);
  transition: border-color 0.2s, background 0.2s;
}
.graph-area.drag-over {
  border-color: var(--color-primary);
  background: var(--color-primary-light);
}
svg {
  width: 100%;
  height: 100%;
  display: block;
}
.links line {
  stroke: #999;
  stroke-opacity: 0.6;
}
.nodes circle {
  stroke: #fff;
  stroke-width: 2px;
}
.nodes text {
  pointer-events: none;
  font-family: sans-serif;
  font-size: 12px;
}
</style> 