'use client'

import { useState } from 'react'
import * as Tabs from '@radix-ui/react-tabs'
import { BarChart3, Table, FileText, Network } from 'lucide-react'

interface CanvasProps {
  className?: string
}

export function Canvas({ className }: CanvasProps) {
  const [activeTab, setActiveTab] = useState('visuals')

  return (
    <div className={`border-l bg-background ${className}`}>
      <Tabs.Root value={activeTab} onValueChange={setActiveTab} className="h-full">
        <Tabs.List className="flex border-b">
          <Tabs.Trigger
            value="visuals"
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary"
          >
            <BarChart3 className="h-4 w-4" />
            Visuals
          </Tabs.Trigger>
          <Tabs.Trigger
            value="tables"
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary"
          >
            <Table className="h-4 w-4" />
            Tables
          </Tabs.Trigger>
          <Tabs.Trigger
            value="docs"
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary"
          >
            <FileText className="h-4 w-4" />
            Docs
          </Tabs.Trigger>
          <Tabs.Trigger
            value="lineage"
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary"
          >
            <Network className="h-4 w-4" />
            Lineage
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="visuals" className="p-4 h-full">
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 mx-auto mb-4" />
              <p>Visualizations will appear here</p>
              <p className="text-sm">Charts, graphs, and plots from your queries</p>
            </div>
          </div>
        </Tabs.Content>

        <Tabs.Content value="tables" className="p-4 h-full">
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <Table className="h-12 w-12 mx-auto mb-4" />
              <p>Query results will appear here</p>
              <p className="text-sm">Tabular data from your database queries</p>
            </div>
          </div>
        </Tabs.Content>

        <Tabs.Content value="docs" className="p-4 h-full">
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <FileText className="h-12 w-12 mx-auto mb-4" />
              <p>Document search results will appear here</p>
              <p className="text-sm">Relevant documents and citations</p>
            </div>
          </div>
        </Tabs.Content>

        <Tabs.Content value="lineage" className="p-4 h-full">
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <Network className="h-12 w-12 mx-auto mb-4" />
              <p>Schema and lineage diagrams will appear here</p>
              <p className="text-sm">Database schema and relationship graphs</p>
            </div>
          </div>
        </Tabs.Content>
      </Tabs.Root>
    </div>
  )
}