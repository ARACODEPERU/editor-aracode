# Graph Report - .  (2026-05-10)

## Corpus Check
- Corpus is ~4,775 words - fits in a single context window. You may not need a graph.

## Summary
- 103 nodes · 150 edges · 13 communities (6 shown, 7 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Editor Commands|Editor Commands]]
- [[_COMMUNITY_Editor Controller|Editor Controller]]
- [[_COMMUNITY_Tooling and Configuration|Tooling and Configuration]]
- [[_COMMUNITY_Dialog UI|Dialog UI]]
- [[_COMMUNITY_Color Picker|Color Picker]]
- [[_COMMUNITY_Image Controller|Image Controller]]
- [[_COMMUNITY_Main Architecture|Main Architecture]]
- [[_COMMUNITY_Examples and Index|Examples and Index]]
- [[_COMMUNITY_Vite Config Data|Vite Config Data]]
- [[_COMMUNITY_Upload Example Data|Upload Example Data]]

## God Nodes (most connected - your core abstractions)
1. `Commands` - 30 edges
2. `AracodeEditor` - 18 edges
3. `Dialog` - 9 edges
4. `t()` - 7 edges
5. `Toolbar` - 7 edges
6. `ColorPicker` - 7 edges
7. `ImageController` - 7 edges
8. `Editor Controller` - 4 edges
9. `Entry Point` - 3 edges
10. `Dialog UI` - 2 edges

## Surprising Connections (you probably didn't know these)
- `Main Index` --references--> `Entry Point`  [INFERRED]
  index.html → src/index.js
- `Full Example` --references--> `Entry Point`  [INFERRED]
  examples/full.html → src/index.js
- `Simple Example` --references--> `Entry Point`  [INFERRED]
  examples/simple.html → src/index.js
- `Color Picker UI` --semantically_similar_to--> `Image Controller UI`  [INFERRED] [semantically similar]
  src/ui/color-picker.js → src/ui/image-controller.js
- `Editor Controller` --calls--> `Language Helpers`  [EXTRACTED]
  src/core/editor.js → src/lang.js

## Hyperedges (group relationships)
- **UI Components** — src_ui_color_picker, src_ui_dialog, src_ui_image_controller [INFERRED 0.80]
- **Core Architecture** — src_core_editor, src_core_commands, src_core_toolbar [INFERRED 0.80]

## Communities (13 total, 7 thin omitted)

### Community 2 - "Tooling and Configuration"
Cohesion: 0.15
Nodes (6): DEFAULT_OPTIONS, DEFAULT_TOOLS, HEADING_OPTIONS, TOOL_ICONS, Toolbar, locales

### Community 6 - "Main Architecture"
Cohesion: 0.29
Nodes (7): Core Commands, Editor Controller, Toolbar Component, Language Helpers, Color Picker UI, Dialog UI, Image Controller UI

### Community 8 - "Examples and Index"
Cohesion: 0.5
Nodes (4): Full Example, Simple Example, Main Index, Entry Point

## Knowledge Gaps
- **15 isolated node(s):** `locales`, `DEFAULT_OPTIONS`, `DEFAULT_TOOLS`, `HEADING_OPTIONS`, `TOOL_ICONS` (+10 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Commands` connect `Editor Commands` to `Tooling and Configuration`, `Alignment Commands`?**
  _High betweenness centrality (0.369) - this node is a cross-community bridge._
- **Why does `AracodeEditor` connect `Editor Controller` to `Tooling and Configuration`?**
  _High betweenness centrality (0.205) - this node is a cross-community bridge._
- **Why does `Dialog` connect `Dialog UI` to `Tooling and Configuration`?**
  _High betweenness centrality (0.112) - this node is a cross-community bridge._
- **What connects `locales`, `DEFAULT_OPTIONS`, `DEFAULT_TOOLS` to the rest of the system?**
  _15 weakly-connected nodes found - possible documentation gaps or missing edges._