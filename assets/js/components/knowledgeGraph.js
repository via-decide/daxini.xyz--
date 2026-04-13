/*
  assets/js/components/knowledgeGraph.js
  D3.js force-directed graph optimized for the Research OS theme.
*/

export class KnowledgeGraph {
    constructor(mountId) {
        this.mount = document.getElementById(mountId);
        this.data = { nodes: [{ id: 'CORE', label: 'ZAYVORA' }], links: [] };
        this.init();
    }

    init() {
        const width = this.mount.clientWidth || 340;
        const height = this.mount.clientHeight || 400;

        this.svg = d3.select(this.mount).append('svg')
            .attr('width', '100%').attr('height', '100%')
            .attr('viewBox', `0 0 ${width} ${height}`);

        this.sim = d3.forceSimulation(this.data.nodes)
            .force('link', d3.forceLink(this.data.links).id(d => d.id).distance(70))
            .force('charge', d3.forceManyBody().strength(-100))
            .force('center', d3.forceCenter(width / 2, height / 2));

        this.render();
    }

    render() {
        this.svg.selectAll('*').remove();

        const link = this.svg.append('g').attr('stroke', 'var(--bd)').selectAll('line')
            .data(this.data.links).join('line');

        const node = this.svg.append('g').selectAll('circle')
            .data(this.data.nodes).join('circle')
            .attr('r', d => d.id === 'CORE' ? 7 : 4)
            .attr('fill', d => d.id === 'CORE' ? 'var(--accent)' : 'var(--tx3)')
            .attr('stroke', 'var(--bd)')
            .call(d3.drag().on('start', (e, d) => {
                if (!e.active) this.sim.alphaTarget(0.3).restart();
                d.fx = d.x; d.fy = d.y;
            }).on('drag', (e, d) => {
                d.fx = e.x; d.fy = e.y;
            }).on('end', (e, d) => {
                if (!e.active) this.sim.alphaTarget(0);
                d.fx = null; d.fy = null;
            }));

        this.sim.on('tick', () => {
            link.attr('x1', d => d.source.x).attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
            node.attr('cx', d => d.x).attr('cy', d => d.y);
        });
    }

    add(id, label) {
        if (!this.data.nodes.find(n => n.id === id)) {
            this.data.nodes.push({ id, label });
            this.data.links.push({ source: 'CORE', target: id });
            this.sim.nodes(this.data.nodes);
            this.sim.force('link').links(this.data.links);
            this.sim.alpha(1).restart();
            this.render();
        }
    }

    onEvent(event, data) {
        if (event === 'TOOL_SUCCESS' && data.tool === 'VECTOR_SEARCH') {
            this.add(`N_${Date.now()}`, 'Knowledge Segment');
        }
    }
}
