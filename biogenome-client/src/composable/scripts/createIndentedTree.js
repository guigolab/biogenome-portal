import * as d3 from 'd3'
const width = 768


export function createIndentedTree(ref, root, router) {
    const nodeSize = 17
    const nodes = root.descendants()
    const svg = d3
        .select(ref.value)
        .attr('viewBox', [-nodeSize / 2, (-nodeSize * 3) / 2, width, (nodes.length + 1) * nodeSize])
        .attr('font-family', 'sans-serif')
        .attr('font-size', 10)
        .style('overflow', 'visible')

    const link = svg
        .append('g')
        .attr('fill', 'none')
        .attr('stroke', '#000')
        .selectAll('path')
        .data(root.links())
        .join('path')
        .attr('stroke-width', 2)
        .attr('stroke', (d) => d.target.color)
        .attr(
            'd',
            (d) => `M${d.source.depth * nodeSize},${d.source.index * nodeSize} V${d.target.index * nodeSize} h${nodeSize}`,
        )

    const node = svg
        .append('g')
        .selectAll('g')
        .data(nodes)
        .join('g')
        .attr('transform', (d) => `translate(0,${d.index * nodeSize})`)

    node
        .append('circle')
        .attr('cx', (d) => d.depth * nodeSize)
        .attr('r', 2.5)
        .attr('fill', (d) => (d.children ? null : '#999'))

    node
        .append('text')
        .attr('dy', '0.32em')
        .attr('x', (d) => d.depth * nodeSize + 6)
        .text((d) => `${d.data.name} (${d.data.rank})`)
        .style('cursor', 'pointer')
        .on('click', (event, d) => {
            const path = d.data.leaves === 0 ?
                { name: 'organism', params: { taxid: d.data.taxid } } : { name: 'taxon', params: { taxid: d.data.taxid } }
            router.push(path)
        })

    node.append('title').text((d) =>
        d
            .ancestors()
            .reverse()
            .map((d) => `${d.data.name} (${d.data.rank})`)
            .join(' > '),
    )
}