import * as d3 from 'd3'

function setColor(d: any, domains: any) {
  var name = d.data.name
  const color = d3.scaleOrdinal().domain(domains).range(d3.schemeCategory10)
  d.color = color.domain().indexOf(name) >= 0 ? color(name) : d.parent ? d.parent.color : null
  if (d.children) {
    d.children.forEach((item: any) => {
      setColor(item, domains)
    })
  }
}

function getTopBranches(root: any) {
  root.each((node: any) => {
    node.data.descendantCount = node.descendants().length;
  });
  root.count()
  // Sort the nodes in descending order based on the number of descendants
  const sortedNodes = root.descendants().sort((a: any, b: any) => b.value - a.value)
  // Select the top branches without descendants
  const selectedBranches: any = [];
  sortedNodes.filter((n: any) => n.parent).forEach((node: any) => {
    const isDescendantOfSelectedBranch = selectedBranches.some((branch: any) => node.ancestors().includes(branch));
    if (!isDescendantOfSelectedBranch) {
      selectedBranches.push(node);
    }
  })
  // Now you have the selected top branches with the most descendants
  const mappedBranches = selectedBranches.map((n: any) => n.data.name)
  setColor(root, mappedBranches)
  return selectedBranches
}

export function useTreeData(data: any) {
  let i = 0
  const root = d3.hierarchy(data, (d) => d.children).eachBefore((d: any) => (d.index = i++))
  const domains = getTopBranches(root)
  return { root, domains }
}
