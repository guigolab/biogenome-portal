<template>
    <div>
        <svg ref="sunburst"></svg>
    </div>
</template>

<script setup lang="ts">
    import * as d3 from 'd3'
    import {onMounted, ref} from 'vue'
    import TaxonService from '../../services/clients/TaxonService';
    
    const sunburst = ref()
    const breadcrumbHeight = 30
    const breadcrumbWidth = 75
    const width = 640
    const radius = width/2
    const domains = ref([])

    const arc = d3
        .arc()
        .startAngle(d => d.x0)
        .endAngle(d => d.x1)
        .padAngle(1 / radius)
        .padRadius(radius)
        .innerRadius(d => Math.sqrt(d.y0))
        .outerRadius(d => Math.sqrt(d.y1) - 1)
        
    const mousearc =  d3
        .arc()
        .startAngle(d => d.x0)
        .endAngle(d => d.x1)
        .innerRadius(d => Math.sqrt(d.y0))
        .outerRadius(radius)
    
    const rootNode = import.meta.env.VITE_ROOT_NODE ? 
    import.meta.env.VITE_ROOT_NODE : '131567'

    onMounted(async() => {
        console.log('hello')
        const {data} = await TaxonService.getTree(rootNode)
        const svg = d3.select(sunburst.value)
        const element = svg.node();
        element.value = { sequence: [], percentage: 0.0 };
        const root = d3.partition().size([2 * Math.PI, radius * radius])(
        d3.hierarchy(data)      .sum(d => d.leaves)
        .sort((a, b) => b.leaves - a.leaves))
        const sortedDomains = root
        .descendants()
        .filter((n) => n.children)
        .sort((a, b) => {
            if (a.descendants() === b.descendants()) {
            return a.leaves > b.leaves ? -1 : 1
            } else if (a.leaves === b.leaves) {
            return a.height > b.height ? -1 : 1
            } else {
            return a.descendants().length > b.descendants().length ? -1 : 1
            }
        })
        const slicedDomains = sortedDomains.length > 6 ? sortedDomains.slice(0, 6) : sortedDomains
        domains.value = [...slicedDomains.map((d) => d.data.name)]
        console.log(domains.value)
        const label = svg
            .append("text")
            .attr("text-anchor", "middle")
            .attr("fill", "#888")
            .style("visibility", "hidden");

        label
            .append("tspan")
            .attr("class", "percentage")
            .attr("x", 0)
            .attr("y", 0)
            .attr("dy", "-0.1em")
            .attr("font-size", "3em")
            .text("");

        label
            .append("tspan")
            .attr("x", 0)
            .attr("y", 0)
            .attr("dy", "1.5em")
            .text("of visits begin with this sequence");

        svg
            .attr("viewBox", `${-radius} ${-radius} ${width} ${width}`)
            .style("max-width", `${width}px`)
            .style("font", "12px sans-serif");

        const path = svg
            .append("g")
            .selectAll("path")
            .data(
            root.descendants().filter(d => {
                // Don't draw the root node, and for efficiency, filter out nodes that would be too small to see
                return d.depth;
            })
            )
            .join("path")
            .attr("fill", d => color(d.data.name))
            .attr("d", arc);

        svg
            .append("g")
            .attr("fill", "none")
            .attr("pointer-events", "all")
            .on("mouseleave", () => {
            path.attr("fill-opacity", 1);
            label.style("visibility", "hidden");
            // Update the value of this view
            element.value = { sequence: [], percentage: 0.0 };
            element.dispatchEvent(new CustomEvent("input"));
            })
            .selectAll("path")
            .data(
            root.descendants().filter(d => {
                // Don't draw the root node, and for efficiency, filter out nodes that would be too small to see
                return d.depth;
            })
            )
            .join("path")
            .attr("d", mousearc)
            .on("mouseenter", (event, d) => {
            // Get the ancestors of the current segment, minus the root
            const sequence = d
                .ancestors()
                .reverse()
                .slice(1);
            // Highlight the ancestors
            path.attr("fill-opacity", node =>
                sequence.indexOf(node) >= 0 ? 1.0 : 0.3
            );
            label
                .style("visibility", null)
                .select(".percentage")
                .text(`organisms ${d.data.leaves}`);
            const leaves = d.data.leaves
            // Update the value of this view with the currently hovered sequence and percentage
            element.value = { sequence, leaves};
            element.dispatchEvent(new CustomEvent("input"));
            });

    })
  
    function breadcrumbPoints(d, i) {
        const tipWidth = 10;
        const points = [];
        points.push("0,0");
        points.push(`${breadcrumbWidth},0`);
        points.push(`${breadcrumbWidth + tipWidth},${breadcrumbHeight / 2}`);
        points.push(`${breadcrumbWidth},${breadcrumbHeight}`);
        points.push(`0,${breadcrumbHeight}`);
        if (i > 0) {
            // Leftmost breadcrumb; don't include 6th vertex.
            points.push(`${tipWidth},${breadcrumbHeight / 2}`);
        }
        return points.join(" ");
    }

    function color() {
        const color = d3.scaleOrdinal().domain(domains.value).range(d3.schemeCategory10)
        return color
    }
    </script>