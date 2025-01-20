import { Canvg } from 'canvg'


export function downloadSVGImage(tree, taxid) {
//     const svg = tree.cloneNode(true) // clone your original svg
//     const g = svg.querySelector('g') // select the parent g
//     g.setAttribute('transform', '') // clean transform
//     svg.setAttribute('background-color', 'white')
//     g.setAttribute('background-color', 'white')
//     const svgBlob = new Blob([svgData], {type:"image/svg+xml;charset=utf-8"});
//     const svgData = `data:image/svg+xml,${encodeURIComponent(svgAsXML)}`
//     const link = document.createElement('a')
//     link.setAttribute('href', svgData)
//     link.setAttribute('download', `${taxid}.svg`)
//     link.click()
//     var svgData = $("#figureSvg")[0].outerHTML;
// var svgBlob = new Blob([svgData], {type:"image/svg+xml;charset=utf-8"});
// var svgUrl = URL.createObjectURL(svgBlob);
// var downloadLink = document.createElement("a");
// downloadLink.href = svgUrl;
// downloadLink.download = "newesttree.svg";
// document.body.appendChild(downloadLink);
// downloadLink.click();
// document.body.removeChild(downloadLink);
  }

 export function downloadPGNImage(tree) {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const svgAsXML = new XMLSerializer().serializeToString(tree)
    ctx.canvas.width = 2000
    ctx.canvas.height = 2000
    const v = Canvg.fromString(ctx, svgAsXML)
    v.start()
    ctx.globalCompositeOperation = 'destination-over'
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)
    const link = document.createElement('a')
    link.setAttribute('href', canvas.toDataURL('image/png'))
    link.setAttribute('download', 'image.png')
    link.click()
  }