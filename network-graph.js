// source: https://www.nayuki.io/page/animated-floating-graph-nodes

// composePipe :: [(a -> b)] -> (a -> b)
const pipe = (...fns) => fns.reduceRight ((f, g) => (...args) => f (g (...args)));

let idealNumNodes = 10; // 1 - 300, default 70
let maxExtraEdges = 20; // 0 - 1000, default 20
let radiiWeightPower = 0.5; // 0.0 mesh, 0.5 balanced, 1.0 Hub-and-Spoke, default 0.5
let driftSpeed = 1; // 0 - 100, default 1
let repulsionForce = 1; // 0 - 100, default 1

const getNumberOfEdges = () => Math.round(maxExtraEdges / 100 * idealNumNodes);

const BORDER_FADE = -0.02;
const FADE_IN_RATE = 0.06;  // In the range (0.0, 1.0]
const FADE_OUT_RATE = 0.03;  // In the range (0.0, 1.0]
const FRAME_INTERVAL = 200000;  // In milliseconds, default 20

// making functional and curring
// getBoundingClientRect :: a -> b
const getBoundingClientRect = svgElement => svgElement.getBoundingClientRect();
// setAttribute :: a -> b -> c -> c
const setAttribute = param => value => element => element.setAttribute (param, value) || element;
// appendChild :: a -> b -> b
const appendChild = child => parent => parent.appendChild (child) && parent;
// select :: a -> (b -> c) -> c -> c
const inSelection = selector => fn => parent => fn (parent.querySelector (selector)) && parent;
// select :: a -> (b -> c) -> c -> c
const inCreatedElementNS = name => fn => namespaceElement =>
    fn (document.createElementNS (namespaceElement.namespaceURI, name)) && namespaceElement;

// relDimensionsFromBounding :: a -> b
const relDimensionsFromBounding = boundRect => ({
    width: boundRect.width  / Math.max(boundRect.width, boundRect.height),
    height: boundRect.height / Math.max(boundRect.width, boundRect.height)
});

// setSvgAttributes :: a -> c -> c
const setSvgAttributes = dimensions => pipe (
    setAttribute ('viewBox') (`0 0 ${dimensions.width} ${dimensions.height}`),
    inSelection ('rect') (pipe (
        setAttribute ('x') ((dimensions.width - 1) / 2),
        setAttribute ('y') ((dimensions.height - 1) / 2)
    ))
);

const initialize = svgElement => {
    const dimensions = relDimensionsFromBounding (getBoundingClientRect (svgElement));
    setSvgAttributes (dimensions) (svgElement);
    //const nodes = createNewNodes (dimensions) (0);
    stepFrame ([]) ([]) (svgElement);
    return svgElement;
};

const updateNode = dimensions => index => node => ({
    // Move based on velocity
    posX: node.posX + (node.velX * driftSpeed),
    posY: node.posY + (node.velY * driftSpeed),
    // Randomly perturb velocity, with damping
    velX: node.velX * 0.99 + (Math.random() - 0.5) * 0.3,
    velY: node.velY * 0.99 + (Math.random() - 0.5) * 0.3,
    radius: node.radius,
    // Fade out nodes near the borders of the space or exceeding the target number of nodes
    opacity: (index >= idealNumNodes || node.posX < BORDER_FADE || dimensions.width - node.posX < BORDER_FADE
        || node.posY < BORDER_FADE || dimensions.height - node.posY < BORDER_FADE) ? 
        Math.max(node.opacity - FADE_OUT_RATE, 0) :
        Math.min(node.opacity + FADE_IN_RATE, 1)
});

const deleteFadedOutNodes = nodes => {
    nodes.forEach ((node, index) => {
        if (node.opacity === 0) nodes.splice (index, 1);
    });
    return nodes;
};

const updateNodes = dimensions => nodes => 
    nodes.map ((node, index) => updateNode (dimensions) (index) (node));

const createNewNode = dimensions => ({ 
    // Random position and radius, other properties initially zero
    posX: Math.random() * dimensions.width,
    posY: Math.random() * dimensions.height,
    radius: (Math.pow(Math.random(), 5) + 0.35) * 0.015,  // Skew toward smaller values
    velX: 0.0,
    velY: 0.0,
    opacity: 0.0,
});

const createNewNodes = dimensions => numberOfNodes => {
    const newNodes = [];
    for (var i = numberOfNodes; i < idealNumNodes; i++) {
		newNodes.push(createNewNode (dimensions));
    }
    return newNodes;
};

// Updates the position of each node in the given array (in place), based on
// their existing positions. Returns nothing. No other side effects.
function doForceField(nodes) {
	var deltas = [];
	for (var i = 0; i < nodes.length * 2; i++)
		deltas.push(0.0);
	
	// For simplicitly, we perturb positions directly, instead of velocities
	for (var i = 0; i < nodes.length; i++) {
		var nodeA = nodes[i];
		for (var j = 0; j < i; j++) {
			var nodeB = nodes[j];
			var dx = nodeA.posX - nodeB.posX;
			var dy = nodeA.posY - nodeB.posY;
			var distSqr = dx * dx + dy * dy;
			// Notes: The factor 1/sqrt(distSqr) is to make (dx, dy) into a unit vector.
			// 1/distSqr is the inverse square law, with a smoothing constant added to prevent singularity.
			var factor = repulsionForce / (Math.sqrt(distSqr) * (distSqr + 0.00001));
			dx *= factor;
			dy *= factor;
			deltas[i * 2 + 0] += dx;
			deltas[i * 2 + 1] += dy;
			deltas[j * 2 + 0] -= dx;
			deltas[j * 2 + 1] -= dy;
		}
	}
	for (var i = 0; i < nodes.length; i++) {
		nodes[i].posX += deltas[i * 2 + 0];
		nodes[i].posY += deltas[i * 2 + 1];
	}
}

// Returns a sorted array of edges with weights, for all unique edge pairs. Pure function, no side effects.
const calcAllEdgeWeights = nodes => {
	// Each entry has the form [weight, nodeAIndex, nodeBIndex], where nodeAIndex < nodeBIndex
	var result = [];
	for (var i = 0; i < nodes.length; i++) {  // Calculate all n * (n - 1) / 2 edges
		var nodeA = nodes[i];
		for (var j = 0; j < i; j++) {
			var nodeB = nodes[j];
			var weight = Math.hypot(nodeA.posX - nodeB.posX, nodeA.posY - nodeB.posY);  // Euclidean distance
			weight /= Math.pow(nodeA.radius * nodeB.radius, radiiWeightPower);  // Give discount based on node radii
			result.push([weight, i, j]);
		}
	}
	
	// Sort array by ascending weight
	result.sort(function(a, b) {
		var x = a[0], y = b[0];
		return x < y ? -1 : (x > y ? 1 : 0);
	});
	return result;
};

const updateEdges = nodes => edges => {
	// Calculate array of spanning tree edges, then add some extra low-weight edges
	var allEdges = calcAllEdgeWeights (nodes);
	var idealEdges = calcSpanningTree (allEdges) (nodes);
	for (var i = 0; i < allEdges.length && idealEdges.length < nodes.length - 1 + maxExtraEdges; i++) {
		var edge = {nodeA:nodes[allEdges[i][1]], nodeB:nodes[allEdges[i][2]]};  // Convert data formats
		if (!containsEdge(idealEdges, edge))
			idealEdges.push(edge);
	}
	allEdges = null;  // Let this big array become garbage sooner
	
	// Classify each current edge, checking whether it is in the ideal set; prune faded edges
	var newEdges = [];
	edges.forEach(function(edge) {
		if (containsEdge(idealEdges, edge))
			edge.opacity = Math.min(edge.opacity + FADE_IN_RATE, 1);
		else
			edge.opacity = Math.max(edge.opacity - FADE_OUT_RATE, 0);
		if (edge.opacity > 0 && edge.nodeA.opacity > 0 && edge.nodeB.opacity > 0)
			newEdges.push(edge);
	});
	
	// If there is room for new edges, add some missing spanning tree edges (higher priority), then extra edges
	for (var i = 0; i < idealEdges.length && newEdges.length < nodes.length - 1 + maxExtraEdges; i++) {
		var edge = idealEdges[i];
		if (!containsEdge(newEdges, edge)) {
			edge.opacity = 0.0;  // Add missing property
			newEdges.push(edge);
		}
	}
	return newEdges;
};

// Returns a new array of edge objects that is a minimal spanning tree on the given set
// of nodes, with edges in ascending order of weight. Note that the returned edge objects
// are missing the opacity property. Pure function, no side effects.
const calcSpanningTree = allEdges => nodes => {
	// Kruskal's MST algorithm
	var result = [];
	var ds = new DisjointSet(nodes.length);
	for (var i = 0; i < allEdges.length && result.length < nodes.length - 1; i++) {
		var edge = allEdges[i];
		var j = edge[1];
		var k = edge[2];
		if (ds.mergeSets(j, k))
			result.push({nodeA:nodes[j], nodeB:nodes[k]});
	}
	return result;
};

// Tests whether the given array of edge objects contains an edge with
// the given endpoints (undirected). Pure function, no side effects.
function containsEdge(array, edge) {
	for (var i = 0; i < array.length; i++) {
		var elem = array[i];
		if (elem.nodeA == edge.nodeA && elem.nodeB == edge.nodeB ||
		    elem.nodeA == edge.nodeB && elem.nodeB == edge.nodeA)
			return true;
	}
	return false;
}


// The union-find data structure. A heavily stripped-down version
// derived from https://www.nayuki.io/page/disjoint-set-data-structure .
function DisjointSet(size) {
	var parents = [];
	var ranks = [];
	for (var i = 0; i < size; i++) {
		parents.push(i);
		ranks.push(0);
	}
	
	this.mergeSets = function(i, j) {
		var repr0 = getRepr(i);
		var repr1 = getRepr(j);
		if (repr0 == repr1)
			return false;
		var cmp = ranks[repr0] - ranks[repr1];
		if (cmp >= 0) {
			if (cmp == 0)
				ranks[repr0]++;
			parents[repr1] = repr0;
		} else
			parents[repr0] = repr1;
		return true;
	};
	
	function getRepr(i) {
		if (parents[i] != i)
			parents[i] = getRepr(parents[i]);
		return parents[i];
	}
}

// Redraws the SVG image based on the given values. No other side effects.
function redrawOutput(svgElem, nodes, edges) {
	// Clear movable objects
    var gElem = svgElem.querySelector("g");
	while (gElem.firstChild != null)
		gElem.removeChild(gElem.firstChild);
	
	// Draw every node
	nodes.forEach(function(node) {
		var circElem = document.createElementNS(svgElem.namespaceURI, "circle");
		circElem.setAttribute("cx", node.posX);
		circElem.setAttribute("cy", node.posY);
		circElem.setAttribute("r", node.radius);
        //circElem.setAttribute("fill", "rgba(129,139,197," + node.opacity.toFixed(3) + ")");
        circElem.setAttribute("fill", "rgba(129,139,197,1)");
		gElem.appendChild(circElem);
	});
	
	// Draw every edge
	edges.forEach(function(edge) {
		var nodeA = edge.nodeA;
		var nodeB = edge.nodeB;
		var dx = nodeA.posX - nodeB.posX;
		var dy = nodeA.posY - nodeB.posY;
		var mag = Math.hypot(dx, dy);
		if (mag > nodeA.radius + nodeB.radius) {  // Draw edge only if circles don't intersect
			dx /= mag;  // Make (dx, dy) a unit vector, pointing from B to A
			dy /= mag;
			var opacity = Math.min(Math.min(nodeA.opacity, nodeB.opacity), edge.opacity);
			var lineElem = document.createElementNS(svgElem.namespaceURI, "line");
			// Shorten the edge so that it only touches the circumference of each circle
			lineElem.setAttribute("x1", nodeA.posX - dx * nodeA.radius);
			lineElem.setAttribute("y1", nodeA.posY - dy * nodeA.radius);
			lineElem.setAttribute("x2", nodeB.posX + dx * nodeB.radius);
			lineElem.setAttribute("y2", nodeB.posY + dy * nodeB.radius);
            //lineElem.setAttribute("stroke", "rgba(129,139,197," + opacity.toFixed(3) + ")");
            lineElem.setAttribute("stroke", "rgba(129,139,197,1)");
			gElem.appendChild(lineElem);
		}
	});
}

const stepFrame = nodes => edges => svgElement => {
    const dimensions = relDimensionsFromBounding (getBoundingClientRect (svgElement));
    const updatedNodes = deleteFadedOutNodes (updateNodes (dimensions) (nodes));
    const newNodes = (updatedNodes.length < idealNumNodes) ? createNewNodes (dimensions) (updatedNodes.length) : [];
    const totalNodes = [].concat (updatedNodes, newNodes);
    /*for (var i = 0; i < 300; i++)  // Spread out nodes to avoid ugly clumping
		doForceField(totalNodes);*/
    //const totalEdges = updateEdges (nodes) (edges);
    const totalEdges = [];
    redrawOutput (svgElement, totalNodes, totalEdges);
    setTimeout (() => stepFrame (totalNodes) (totalEdges) (svgElement), FRAME_INTERVAL);
};

initialize (document.querySelector("article svg"));