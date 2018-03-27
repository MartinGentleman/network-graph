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
const FRAME_INTERVAL = 2000;  // In milliseconds, default 20

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
    const nodes = createNewNodes (dimensions) (0);
    //stepFrame ([]) ([]) (svgElement);
    return svgElement;
};

const updateNodes = dimensions => nodes => (nodes.map (
    (node, index) => ({
        // Move based on velocity
        posX: node.posX + node.velX * driftSpeed,
        posY: node.posY + node.velY * driftSpeed,
        // Randomly perturb velocity, with damping
		velX: node.velX * 0.99 + (Math.random() - 0.5) * 0.3,
        velY: node.velY * 0.99 + (Math.random() - 0.5) * 0.3,
        // Fade out nodes near the borders of the space or exceeding the target number of nodes
        opacity: (index >= idealNumNodes || node.posX < BORDER_FADE || dimensions.width - node.posX < BORDER_FADE
            || node.posY < BORDER_FADE || dimensions.height - node.posY < BORDER_FADE) ? 
            Math.max(node.opacity - FADE_OUT_RATE, 0) :
            Math.min(node.opacity + FADE_IN_RATE, 1)
    })).map ((node, index) => (node.opacity === 0) ? delete nodes [index] : node) // TODO: this doesnt account for lowering ideal number of nodes
);

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

const stepFrame = nodes => edges => svgElement => {
    const dimensions = relDimensionsFromBounding (getBoundingClientRect (svgElement))
    const updatedNodes = updateNodes (dimensions) (nodes);
    const newNodes = (updatedNodes.length < idealNumNodes) ? createNewNodes (dimensions) (updatedNodes.length) : [];
    const totalNodes = [].concat (updatedNodes, newNodes);
    console.log (totalNodes);
    // TODO: doForceField
    const totalEdges = [];
    //setTimeout (() => stepFrame (totalNodes) (totalEdges) (svgElement), FRAME_INTERVAL);
};

initialize (document.querySelector("article svg"));