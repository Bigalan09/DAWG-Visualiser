function convertToHierarchy(rawData) {
  const hierarchy = {
    name: rawData.Label,
    isEndOfWord: rawData.IsEndOfWord,
    children: Object.values(rawData.Edges).map(convertToHierarchy),
  };
  return hierarchy;
}

function createDawgVisualizationWithFabric(dawg) {
  const canvas = new fabric.Canvas("canvas", {
    width: window.innerWidth,
    height: window.innerHeight,
  });
  canvas.selection = false;

  // Configure panning and zooming
  canvas.on("mouse:wheel", function (opt) {
    const delta = -opt.e.deltaY / 2; // Reduce the scroll speed
    let zoom = canvas.getZoom();
    zoom = zoom + delta / 200;
    zoom = Math.min(Math.max(zoom, 0.1), 4);

    // Calculate the new position of the point under the mouse
    const point = new fabric.Point(opt.pointer.x, opt.pointer.y);
    const zoomPoint = fabric.util.transformPoint(
      point,
      canvas.viewportTransform
    );

    // Update the viewport transform to focus on the mouse pointer
    canvas.zoomToPoint(zoomPoint, zoom);

    opt.e.preventDefault();
    opt.e.stopPropagation();
  });

  canvas.on("mouse:down", function (opt) {
    const evt = opt.e;
    this.isDragging = true;
    this.selection = false;
    this.lastPosX = evt.clientX;
    this.lastPosY = evt.clientY;
  });

  canvas.on("mouse:move", function (opt) {
    if (this.isDragging) {
      const evt = opt.e;
      const zoom = canvas.getZoom();
      const currentX = evt.clientX;
      const currentY = evt.clientY;
      const deltaX = (currentX - this.lastPosX) / zoom;
      const deltaY = (currentY - this.lastPosY) / zoom;

      this.viewportTransform[4] += deltaX;
      this.viewportTransform[5] += deltaY;
      this.requestRenderAll();

      this.lastPosX = currentX;
      this.lastPosY = currentY;
    }
  });

  canvas.on("mouse:up", function (opt) {
    this.isDragging = false;
    this.selection = true;
  });

  // Create DAWG visualization
  const treeLayout = d3
    .tree()
    .nodeSize([200, 200])
    .size([canvas.height * 300, canvas.width]);
  const root = d3.hierarchy(dawg);
  treeLayout(root);

  root.descendants().forEach((node, i) => {
    if (!node.parent) return;

    const circle = new fabric.Circle({
      radius: 10,
      fill: node.data.isEndOfWord ? "red" : "white",
      stroke: "black",
      left: node.y,
      top: node.x,
      hasBorders: false,
      hasControls: false,
      originX: "center",
      originY: "center",
      data: {
        node: node,
      },
    });

    canvas.add(circle);

    const label = new fabric.Text(node.data.name, {
      left: node.y - 25,
      top: node.x - 25,
      fontSize: 14,
      hasBorders: false,
      hasControls: false,
      selectable: false,
    });

    canvas.add(label);

    if (node.parent && node.parent.parent) {
      const line = new fabric.Line(
        [node.y, node.x, node.parent.y, node.parent.x],
        {
          stroke: "black",
          hasBorders: false,
          hasControls: false,
          selectable: false,
        }
      );

      canvas.add(line);
    }
  });

  const centerX = canvas.width / 2 - root.y;
  const centerY = canvas.height / 2 - root.x;
  canvas.viewportTransform[4] = centerX;
  canvas.viewportTransform[5] = centerY;
}

d3.json("dawg_data.json")
  .then((rawData) => {
    const dawg = convertToHierarchy(rawData);
    createDawgVisualizationWithFabric(dawg);
  })
  .catch((error) => {
    console.error("Error loading JSON data:", error);
  });
