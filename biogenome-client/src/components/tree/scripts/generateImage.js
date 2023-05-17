import { Canvg } from 'canvg'


export function downloadSVGImage(tree) {
    const svg = tree.cloneNode(true) // clone your original svg
    const g = svg.querySelector('g') // select the parent g
    g.setAttribute('transform', '') // clean transform
    svg.setAttribute('background-color', 'white')
    g.setAttribute('background-color', 'white')
    const svgAsXML = new XMLSerializer().serializeToString(svg)
    const svgData = `data:image/svg+xml,${encodeURIComponent(svgAsXML)}`
    const link = document.createElement('a')
    link.setAttribute('href', svgData)
    link.setAttribute('download', 'image.svg')
    link.click()
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