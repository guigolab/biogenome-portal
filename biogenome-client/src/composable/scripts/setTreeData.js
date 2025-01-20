import * as d3 from 'd3'

function setColor(d, domains) {
    var name = d.data.name
    const color = d3.scaleOrdinal().domain(domains).range(d3.schemeCategory10)
    d.color = color.domain().indexOf(name) >= 0 ? color(name) : d.parent ? d.parent.color : null
    if (d.children) {
      d.children.forEach((item) => {
        setColor(item, domains)
      })
    }
  }

function getTopBranches(root){
    root.each(node => {
        node.data.descendantCount = node.descendants().length;
    });
    root.count()
    // Sort the nodes in descending order based on the number of descendants
    const sortedNodes = root.descendants().sort((a, b) => b.value - a.value)
    // Select the top branches without descendants
    const selectedBranches = [];
    sortedNodes.filter(n => n.parent).forEach(node => {
        const isDescendantOfSelectedBranch = selectedBranches.some(branch => node.ancestors().includes(branch));
        if (!isDescendantOfSelectedBranch) {
            selectedBranches.push(node);
        }
    })
    // Now you have the selected top branches with the most descendants
    const mappedBranches = selectedBranches.map(n => n.data.name)
    setColor(root, mappedBranches)
    return selectedBranches
}

export function useTreeData(data){
    let i = 0
    const root = d3.hierarchy(data, (d) => d.children).eachBefore((d) => (d.index = i++))
    const domains = getTopBranches(root)
    return {root,domains}
}
 