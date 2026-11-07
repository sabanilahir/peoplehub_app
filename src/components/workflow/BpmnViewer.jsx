'use client'

import { useEffect, useRef } from 'react'
import BpmnViewer from 'bpmn-js/lib/Viewer'

export default function BpmnViewerComponent({ xml, height = '400px', onElementClick }) {
  const containerRef = useRef(null)
  const viewerRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current || !xml) return

    const viewer = new BpmnViewer({ container: containerRef.current })
    viewerRef.current = viewer

    viewer.importXML(xml).then(() => {
      viewer.get('canvas').zoom('fit-viewport')
    }).catch(err => console.error('Failed to render BPMN:', err))

    // Handle element click
    if (onElementClick) {
      viewer.on('canvas.click', (event) => {
        const element = event.element || event.gfx?.element
        if (element) onElementClick(element)
      })
    }

    return () => viewer.destroy()
  }, [xml])

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden">
      <div ref={containerRef} className="bg-gray-50" style={{ height }} />
    </div>
  )
}
