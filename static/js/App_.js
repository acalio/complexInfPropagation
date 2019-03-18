var replaceNan = (x) => isNaN(x)?0:x

var randomizePositions = (o, range_x, range_y) => {
    o.x = Math.random()*range_x
    o.y = Math.random()*range_y
    o.vx = Math.random()
    o.vy = Math.random()
}


class StatsBlock extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            value: 0,
            percentage: 0
        };
    }

    render() {
        return (<div className={"col-lg col-md-6 col-sm-6 mb-4"}>
            <div className={"stats-small stats-small--1 card card-small"}>
                <div className={"card-body p-0 d-flex"}>
                    <div className={"d-flex flex-column m-auto"}>
                        <div className={" stats-small__data text-center"}>
                            <span className={"stats-small__label text-uppercase"}>
                                {this.props.statTitle}
                            </span>
                            <h6 className={"stats-small__value count my-3"}> {this.state.value}</h6>
                        </div>
                        <div className={"stats-small__data"}>
                            <span
                                className={"stats-small__percentage stats-small__percentage--increase"}>
                                {this.state.percentage}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>);
    }
}


const roleScale = d3.scaleOrdinal()
    .domain(["inactive", "quiescent", "active"])
   .range(["#75739F", "#41A368", "#FE9922"])


class Net extends React.Component {
    constructor(props) {
        super(props)
        this.network = this.network.bind(this)
        this.forceTick = this.forceTick.bind(this)
        this.toggleActive = this.toggleActive.bind(this)
        this.forceLayout = this.forceLayout.bind(this)
        this.state = {nodes: [], edges: []}
    }

    componentDidMount()
    {
        console.log("compoentDidMount")
    }

     componentDidUpdate(prevProps, prevState, snapshot)
    {
        console.log("componentDidUpdate")
        if (prevProps.N !== this.props.N){
            console.log("componentDidUpdate if")
            this.network()//.then(this.forceLayout)rtist
        }
        d3.selectAll('g.node')
            .call(d3.drag().on('drag',(n) => {
                    var e = d3.event
                    console.log(e)
                    n.fx = e.x
                    n.fy = n.y
                    if(this.simulation.alpha()<0.1)
                    {
                        this.simulation.alpha(0.1)
                        this.simulation.restart()
                    }
                })
            )
    }

    toggleActive(id, i)
    {
        const node = d3.select("#" + id).selectAll('circle').filter((n, i) => {
            return i === 0
        })
        node.classed("active", !node.classed("active"))
        this.state.nodes[i].state = this.state.nodes[i].state === "active" ? "inactive" : "active"
        this.setState({nodes: this.state.nodes})
    }

    forceTick()
    {
        const node = this.node
        console.log("forceTick")
        d3.select(node)
            .selectAll("line.link")
            .data(this.state.edges)
            .attr("x1", d => d.source.x)
            .attr("x2", d => d.target.x)
            .attr("y1", d => d.source.y)
            .attr("y2", d => d.target.y)

        d3.select(node)
            .selectAll("g.node")
            .data(this.state.nodes)
            .attr("class", "node")
            .attr("transform", d => `translate(${d.x},${d.y})`)
    }

    forceLayout(nodes, edges)
    {
        console.log("force layout")
        console.log(this.state.nodes)
        var linkForce = d3.forceLink()
        this.simulation = d3.forceSimulation()
            .force("charge", d3.forceManyBody().strength(-60))
            .force("center", d3.forceCenter().x(250).y(250))
            .force("link", linkForce)
            .nodes(nodes)
            .on('tick', this.forceTick);
        this.simulation.force("link").links(edges)

    }

    async network()
    {
        console.log("Make call to network")
        //console.log(this.props.N)
        //console.log(this.props.E)
        if(this.props.N <= 0 || this.props.E <= 0)
            return
        d3.json(`/getNetwork/${this.props.N}/${this.props.E}`)
            .then((data)=>
            {
                //console.log(data)
                var nodes = data.nodes
                var edges = data.links
                //console.log(edges)
                const getNodeCentrality = (edges, node) =>
                        edges.filter(p => p.source === node.id).length

                const nodeHash = {}
                nodes.forEach(node => {
                    nodeHash[node.id] = node
                    node.state = "inactive"
                    node.degreeCentrality = getNodeCentrality(edges, node)
                    //randomizePositions(node, 400,400)
                })

                edges.forEach(edge => {
                    edge.source = nodeHash[edge.source]
                    edge.target = nodeHash[edge.target]
                    edge.id = edge.source.id + "-" + edge.target.id
                })
                this.forceLayout(nodes, edges)
                //console.log(nodes)
                this.setState({nodes: nodes, edges: edges})
                console.log("network finished")
        })
    }

    render() {
        console.log("net render")
        //console.log(this.props.N)
        const nodes = this.state.nodes
        const edges = this.state.edges
        const max_degree = d3.max(nodes.map(node=>node.degreeCentrality))
        console.log(max_degree)
        const circleScale = d3.scaleLinear()
                                .domain([0, max_degree])
                                .range([5, 15])
        var nodesHtml = nodes.map(
            (node, i) =>
                <g key={`node_${node.id}`}
                   id={`node_${node.id}`}
                   className={"node"}>
                    <circle r={circleScale(node.degreeCentrality)}
                            className={"node"}
                            style={{fill: roleScale(node.state)}}
                            onClick={() => this.toggleActive(`node_${node.id}`, i)}
                    />
                </g>)

        var edgesHtml = edges.map(
            (edge) =>
                <line key={edge.id}
                      id={edge.id}
                      className={"link"}
                      markerEnd={"url(#triangle)"}
                      style={{strokeWidth: edge.weight*2, opacity:0.5}}>
                </line>)

        var refsHtml = <defs>
            <marker
                key={"triangle"} id={"triangle"}
                refX={12} refY={6} markerUnits={'userSpaceOnUse'}
                markerWidth={18} markerHeight={12}
                orient={"auto"}
            >
                <path d={'M 0 0 12 6 0 12 3 6'}/>
            </marker>
        </defs>

        //console.log(nodesHtml)
        return <svg ref={node => this.node = node} width={500} height={500}>
                    {edgesHtml}
                    {nodesHtml}
                    {refsHtml}
                </svg>
    }
}



class App extends React.Component {
    constructor(props)
    {
        super(props)
        this.state = {
            N: 0, E:0
        }
        this.updateNetwork = this.updateNetwork.bind(this)
        this.run = this.run.bind(this)
    }

    run()
    {
        const node = this.node
        var active_nodes = d3.select(node)
        console.log(node.state.nodes)
        console.log(active_nodes)
    }


    updateNetwork()
    {
        var n = replaceNan(parseInt(this.N.value))
        var e = replaceNan(parseInt(this.E.value))
        this.setState({N: n, E: e})
    }

    render()
    {
        return (
            <div>
                <div className={"row"}>
                <StatsBlock statTitle={"Inactive Users"}/>
                <StatsBlock statTitle={"Quiescent Users"}/>
                <StatsBlock statTitle={"Active Users"}/>
                </div>
                <div className={"row"}>
                    <div className={"col-lg-8 col-md-12 col-sm-12 mb-4"}>
                        <div className={"card card-small"}>
                            <div className={"card-header border-bottom"}>
                                <h6 className={"m-0"}>Network</h6>
                                <form className={"form-inline"}>
                                    <input className={"form-control form-control-sm"} name={"N"} id={"N"} key={"N"}
                                           ref={N => this.N = N}
                                           type={"text"} placeholder={"Enter the number of nodes..."}/>

                                    <input className={"form-control form-control-sm"} name={'E'} id={'E'}
                                           ref = {E => this.E = E}
                                           type={"text"}
                                           placeholder={"Enter the Number of edges..."}/>
                                    <button type={"button"} onClick={this.updateNetwork} className={"btn mb-2"} value={"Create Graph"}>
                                        Create Graph
                                    </button>
                                       <button type={"button"} onClick={this.run} className={"btn mb-2"} value={"Create Graph"}>
                                        Run
                                    </button>
                                </form>
                            </div>
                            <div id={"network"} className={"card-body pt-0"}>
                                <Net ref={node => this.node=node} N={this.state.N} E={this.state.E} />

                            </div>
                        </div>
                    </div>
                    <div className={"col-lg-4 col-md-6 col-sm-12 mb-4"}>
                        <div className={"card card-small h-100"}>
                            <div className={"card-header border-bottom"}>
                                <h6 className={"m-0"}>Trends</h6>
                            </div>
                            <div className={"card-body d-flex py-0"}>
                            </div>
                        </div>
                    </div>
                </div>
            </div>)
    }
}

ReactDOM.render(<App/>, document.getElementById('app-container'))