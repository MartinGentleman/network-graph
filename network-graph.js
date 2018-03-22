// source: https://www.nayuki.io/page/animated-floating-graph-nodes

// composePipe :: [(a -> b)] -> (a -> b)
const pipe = (...fns) => fns.reduceRight ((f, g) => (...args) => f (g (...args)));

const networkGraphDefaults = {
    idealNumNodes: 70, // 1 - 300, default 70
    maxExtraEdges: 20, // 0 - 1000, default 20
    radiiWeightPower: 0.5, // 0.0 mesh, 0.5 balanced, 1.0 Hub-and-Spoke, default 0.5
    driftSpeed: 1, // 0 - 100, default 1
    repulsionForce: 1 // 0 - 100, default 1
};

const networkGraph = {
    idealNumNodes: 70, // 1 - 300, default 70
    getIdealNumNodes: () => network.idealNumNodes || 70,
    getMaxExtraEdges: () => network.maxExtraEdges || 20,
    getRadiiWeightPower: () => network.radiiWeightPower || 0.5,
    getDriftSpeed: () => network.driftSpeed || 1,
    getRepulsionForce: () => network.repulsionForce || 1,
    setIdealNumNodes: n => {
        network.idealNumNodes = parseInt(this.value, 10);
		network.maxExtraEdges = Math.round(parseFloat(extraEdgesElem.value) / 100 * idealNumNodes);
    },
    setMaxExtraEdges: number => Math.round(parseFloat(number) / 100 * getIdealNumNodes),
    BORDER_FADE: -0.02,
    FADE_IN_RATE: 0.06,  // In the range (0.0, 1.0]
    FADE_OUT_RATE: 0.03,  // In the range (0.0, 1.0]
    FRAME_INTERVAL: 20  // In milliseconds
};

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

// setupSvg :: a -> b
const setupSvg = svgElement => setSvgAttributes (relDimensionsFromBounding (getBoundingClientRect (svgElement))) (svgElement);

const initialize = svgElement => {
	/*const boundRect = svgElement.getBoundingClientRect();
	const relWidth  = boundRect.width  / Math.max(boundRect.width, boundRect.height);
    const relHeight = boundRect.height / Math.max(boundRect.width, boundRect.height);
    svgElem.setAttribute ('viewBox', "0 0 " + relWidth + " " + relHeight);
    svgElem.setAttribute ('viewBox', `0 0 ${relWidth} ${relHeight}`);
	svgElem.querySelector("rect").setAttribute("x", (relWidth  - 1) / 2);
    svgElem.querySelector("rect").setAttribute("y", (relHeight - 1) / 2);*/
    setupSvg (svgElement);
};

initialize (document.querySelector("article svg"));