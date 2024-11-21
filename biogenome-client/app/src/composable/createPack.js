import * as d3 from 'd3'

const width = 400
const height = 400
let view
let focus
let node
let svg
let packRoot
// let label
function zoomTo(v) {
    const k = width / v[2];

    view = v;

    // label.attr("transform", d => `translate(${(d.x - v[0]) * k},${(d.y - v[1]) * k})`);
    node.attr("transform", d => `translate(${(d.x - v[0]) * k},${(d.y - v[1]) * k})`);
    node.attr("r", d => d.r * k);
}

function zoom(event, d) {

    focus = d;
    // currentNode.value = { ...d.data }
    const transition = svg.transition()
        .duration(2000)
        .tween("zoom", d => {
            const i = d3.interpolateZoom(view, [focus.x, focus.y, focus.r * 2]);
            return t => zoomTo(i(t));
        });

    // label
    //   .filter(function(d) { return d.parent === focus || this.style.display === "inline"; })
    //   .transition(transition)
    //     .style("fill-opacity", d => d.parent === focus ? 1 : 0)
    //     .on("start", function(d) { if (d.parent === focus) this.style.display = "inline"; })
    //     .on("end", function(d) { if (d.parent !== focus) this.style.display = "none"; });
}

export function createPack(pack, wrapper, root, domains) {

    packRoot = d3.pack()
        .size([width, height])
        .padding(5)
        (root
            .sum(d => d.children.length === 0 ? 1 : 0)
            .sort((a, b) => b.value - a.value))

    focus = root;
    // currentNode.value = { ...packRoot.data }
    const color = d3.scaleOrdinal(d3.quantize(d3.interpolatePlasma, domains.length + 1))
    var div = d3.select(wrapper.value).append('div')
        .style("position", "absolute")
        .style("text-align", "center")
        .style("padding", .5)
        .style("background", "#FFFFFF")
        .style("color", "#313639")
        .style("border", "1px solid #313639")
        .style("border-radius", "8px")
        .style("font-size", "1.3rem")
        .style("opacity", 0);

    svg = d3.select(pack.value)
        .attr("viewBox", `-${width / 2} -${height / 2} ${width} ${height}`)
        .style("display", "block")
        .style("margin", "0 -14px")
        .style("background", "#f6f6f6")
        .style("cursor", "pointer")
        .on("click", (event) => zoom(event, root));

    node = svg.append("g")
        .style("rotate", "-90deg")
        .selectAll("circle")
        .data(packRoot.descendants().slice(1))
        .join("circle")
        .attr("fill", d => d.children ? color(d.data.name) : "black")
        .attr("pointer-events", d => !d.children ? "none" : null)
        .on("mouseover", function (event, d) {
            console.log(this)
            console.log(d)
            d3.select(this).attr("stroke", "black").attr("stroke-width", 3);
            div.transition().duration('50').style("opacity", 1);
            let name = d.data.name;
            div.html(name).style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 15) + "px");
        })
        .on("mouseout", function () {
            d3.select(this).attr("stroke", null);
            div.transition().duration('50').style("opacity", 0);
        })
        .on("click", (event, d) => focus !== d && (zoom(event, d), event.stopPropagation()));

    node.append("title")
        .text(d => !d.data.leaves ? `${d.data.name}` : `${d.data.name} (${d.data.rank})\nRelated Organisms: ${d.data.leaves}`);

    // label = svg.append("g")
    //     .style("font", "10px sans-serif")
    //     .attr("fill", "black")
    //     .attr("pointer-events", "none")
    //     .attr("text-anchor", "start")
    //   .selectAll("text")
    //   .data(packRoot.descendants())
    //   .join("text")
    //     .style("fill-opacity", d => d.parent === root ? 1 : 0)
    //     .style("display", d => d.parent === root ? "inline" : "none")
    //     .text(d => d.data.name);
    zoomTo([packRoot.x, packRoot.y, packRoot.r * 2]);
}