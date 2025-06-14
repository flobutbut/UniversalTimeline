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
      <svg ref="svgRef">
        <g ref="zoomGroupRef">
          <g class="links">
            <path
              v-for="(link, i) in treeLinks"
              :key="i"
              :d="link.path"
              fill="none"
              stroke="#999"
              stroke-width="2"
              stroke-opacity="0.6"
            />
          </g>
          <g class="nodes">
            <foreignObject
              v-for="node in treeNodes"
              :key="node.id"
              :x="node.y - 120"
              :y="node.x - 40"
              width="240"
              height="80"
              data-debug="nodebox"
            >
              <NodeBox :label="node.label" />
            </foreignObject>
          </g>
        </g>
      </svg>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue';
import * as d3 from 'd3';
import type { GraphPeriod } from '../types/graph';
import { GraphViewService, DatabaseQueryService } from '../services';
import NodeBox from './base/NodeBox.vue';

const graphViewService = GraphViewService.getInstance();
const dbService = DatabaseQueryService.getInstance();
const svgRef = ref<SVGSVGElement | null>(null);
const zoomGroupRef = ref<SVGGElement | null>(null);
const width = ref(800);
const height = ref(600);
const periodList = ref<any[]>([]);
const draggedPeriodId = ref<string | null>(null);
const isDragOver = ref(false);

const treeNodes = ref<any[]>([]);
const treeLinks = ref<any[]>([]);

function updateTreeData() {
  const periods = graphViewService.getPeriods() as GraphPeriod[];
  if (!periods.length) {
    treeNodes.value = [];
    treeLinks.value = [];
    return;
  }
  // Construire la hiérarchie à partir des periods (parentId)
  const nodeMap: Record<string, any> = {};
  periods.forEach(p => nodeMap[p.id] = { ...p, children: [] });
  let rootNodes: any[] = [];
  periods.forEach(p => {
    if (p.parentId && nodeMap[p.parentId]) {
      nodeMap[p.parentId].children.push(nodeMap[p.id]);
    } else {
      rootNodes.push(nodeMap[p.id]);
    }
  });
  let root: d3.HierarchyNode<GraphPeriod>;
  if (rootNodes.length === 1) {
    root = d3.hierarchy<GraphPeriod>(rootNodes[0]);
  } else {
    root = d3.hierarchy<GraphPeriod>({
      id: 'root',
      label: 'Racine',
      description: '',
      startDate: '',
      endDate: '',
      parentId: undefined,
      temporalData: [],
      hasChildren: false,
      isMainEon: false,
      categoryIds: [],
      categoryLabels: [],
      children: rootNodes,
      loading: false,
      childrenPreloaded: true,
      locations: [],
      directLocations: [],
      x: undefined,
      y: undefined,
      fx: undefined,
      fy: undefined,
      vx: undefined,
      vy: undefined
    });
  }
  const treeLayout = d3.tree<GraphPeriod>().size([height.value, width.value - 100]);
  treeLayout(root);
  treeNodes.value = root.descendants().map(d => ({
    id: d.data.id,
    label: d.data.label,
    x: d.x ?? 0,
    y: d.y ?? 0
  }));
  treeLinks.value = root.links().map(link => ({
    source: link.source,
    target: link.target,
    path: d3.linkHorizontal<d3.HierarchyPointLink<GraphPeriod>, d3.HierarchyPointNode<GraphPeriod>>()
      .x(d => d.y)
      .y(d => d.x)
    (link as d3.HierarchyPointLink<GraphPeriod>)
  }));
}

watch(() => [graphViewService.getPeriods(), graphViewService.getLinks()], () => {
  updateTreeData();
  nextTick(() => {
    // Réappliquer le zoom/pan après le DOM update
    if (svgRef.value && zoomGroupRef.value) {
      d3.select(svgRef.value).call(
        d3.zoom<SVGSVGElement, unknown>()
          .scaleExtent([0.1, 5])
          .on('zoom', (event) => {
            d3.select(zoomGroupRef.value).attr('transform', event.transform);
          })
      );
    }
  });
}, { deep: true });

onMounted(async () => {
  periodList.value = await dbService.getAllPeriods();
  updateTreeData();
  nextTick(() => {
    if (svgRef.value && zoomGroupRef.value) {
      d3.select(svgRef.value).call(
        d3.zoom<SVGSVGElement, unknown>()
          .scaleExtent([0.1, 5])
          .on('zoom', (event) => {
            d3.select(zoomGroupRef.value).attr('transform', event.transform);
          })
      );
    }
  });
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