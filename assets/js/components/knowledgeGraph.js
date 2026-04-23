/*
  assets/js/components/knowledgeGraph.js
  D3.js Force-Directed Graph for RAG visualization.
*/

export class KnowledgeGraph {
    constructor(mountId) {
        this.mountId = mountId;
        this.nodes = [];
        this.links = [];
        this.init();
    }

    init() {
        const mount = document.getElementById(this.mountId);
        mount.innerHTML = `<svg id="kg-svg" style="width:100%; height:100%; min-height:300px;"></svg>`;
        this.svg = d3.select("#kg-svg");
    }

    onEvent(event, data) {
        if (event === 'stage' && data.stage === 'RETRIEVE' && data.hits) {
            this.updateFromHits(data.hits);
        }
    }

    updateFromHits(hits) {
        if (this.nodes.length === 0) {
            this.nodes.push({ id: 'Zayvora', type: 'query', group: 1 });
        }

        // Add mock visual nodes for the hits
        for (let i = 0; i < Math.min(hits, 10); i++) {
            const nodeId = `Hit-${Date.now()}-${i}`;
            this.nodes.push({ id: nodeId, type: 'document', group: 2 });
            this.links.push({ source: 'Zayvora', target: nodeId });
        }

        this.render();
    }

    render() {
        const width = document.getElementById('kg-svg').clientWidth || 400;
        const height = document.getElementById('kg-svg').clientHeight || 300;

        this.svg.selectAll("*").remove();

        const simulation = d3.forceSimulation(this.nodes)
            .force("link", d3.forceLink(this.links).id(d => d.id).distance(80))
            .force("charge", d3.forceManyBody().strength(-150))
            .force("center", d3.forceCenter(width / 2, height / 2));

        const link = this.svg.append("g")
            .selectAll("line")
            .data(this.links)
            .enter().append("line")
            .attr("stroke", "rgba(255,255,255,0.1)")
            .attr("stroke-width", 1);

        const node = this.svg.append("g")
            .selectAll("circle")
            .data(this.nodes)
            .enter().append("circle")
            .attr("r", d => d.type === 'query' ? 8 : 4)
            .attr("fill", d => d.type === 'query' ? "#5b8cff" : "#a78bfa")
            .attr("filter", "drop-shadow(0 0 5px rgba(91,140,255,0.4))")
            .call(d3.drag()
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended));

        simulation.on("tick", () => {
            link.attr("x1", d => d.source.x)
                .attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x)
                .attr("y2", d => d.target.y);

            node.attr("cx", d => d.x)
                .attr("cy", d => d.y);
        });

        function dragstarted(event) {
            if (!event.active) {simulation.alphaTarget(0.3).restart();}
            event.subject.fx = event.subject.x;
            event.subject.fy = event.subject.y;
        }

        function dragged(event) {
            event.subject.fx = event.x;
            event.subject.fy = event.y;
        }

        function dragended(event) {
            if (!event.active) {simulation.alphaTarget(0);}
            event.subject.fx = null;
            event.subject.fy = null;
        }
    }

    clear() {
        this.nodes = [];
        this.links = [];
        this.render();
    }
}
