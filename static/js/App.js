var replaceNan = (x) => isNaN(x)?0:x


class StatsBlock extends React.Component {
    constructor(props) {
        super(props);
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
                            <h6 className={"stats-small__value count my-3"}> {this.props.value}</h6>
                        </div>
                        <div className={"stats-small__data"}>
                            <span
                                className={"stats-small__percentage stats-small__percentage--increase"}>
                                {this.props.percentage.toFixed(2)} %
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>);
    }
}


const stateScale = d3.scaleOrdinal()
    .domain(["inactive", "quiescent", "active"])
   .range(["#75739F", "#41A368", "#FE9922"])


class Net extends React.Component {
    constructor(props) {
        super(props)
        this.forceTick = this.forceTick.bind(this)
        this.forceLayout = this.forceLayout.bind(this)
        this.simulation = d3.forceSimulation()
        //this.state = {nodes: [], edges: []}
    }

    componentDidMount()
    {
        console.log("compoentDidMount")
    }

     componentDidUpdate(prevProps, prevState, snapshot)
     {

         this.forceLayout(this.props.nodes, this.props.edges)
         d3.selectAll('g.node')
             .call(d3.drag().on('drag', (n) => {
                     var e = d3.event
                     console.log(e)
                     n.fx = e.x
                     n.fy = n.y
                     if (this.simulation.alpha() < 0.1) {
                         this.simulation.alpha(0.1)
                         this.simulation.restart()
                     }
                 })
             )
     }

     componentWillUnmount()
     {
         this.simulation.stop()
     }

    forceTick()
    {
        const node = this.node
        console.log("forceTick")
        d3.select(node)
            .selectAll("line.link")
            .data(this.props.edges)
            .attr("x1", d => d.source.x)
            .attr("x2", d => d.target.x)
            .attr("y1", d => d.source.y)
            .attr("y2", d => d.target.y)

        d3.select(node)
            .selectAll("g.node")
            .data(this.props.nodes)
            .attr("class", "node")
            .attr("transform", d => `translate(${d.x},${d.y})`)
    }

    forceLayout(nodes, edges) {
        console.log("force layout")
        var linkForce = d3.forceLink()
        this.simulation = d3.forceSimulation()
            .force("charge", d3.forceManyBody().strength(-60))
            .force("center", d3.forceCenter().x(250).y(250))
            .force("link", linkForce)
            .nodes(nodes)
            .on('tick', this.forceTick);
        this.simulation.force("link").links(edges)
    }


    render() {
        console.log("net render")
        const nodes = this.props.nodes
        const edges = this.props.edges
        console.log(this.props.nodes)
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
                            style={{fill: stateScale(node.state)}}
                            onClick={() => this.props.onclick(i)}

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
            N: 0,
            E:0,
            nodes: [],
            edges: [],
            inactive: 0,
            quiescent: 0,
            active: 0,
            running: false,
            runnable: false
        }

        this.updateNetwork = this.updateNetwork.bind(this)
        this.run = this.run.bind(this)
        this.network = this.network.bind(this)
        this.toggleActive = this.toggleActive.bind(this)
        this.transition = this.transition.bind(this)
        this.reset = this.reset.bind(this)
    }

    reset()
    {
        this.state.nodes.forEach(n=>n.state = "inactive")
        this.setState({
            nodes: this.state.nodes,
            inactive: this.state.N,
            quiescent: 0,
            active: 0
        })
    }

    toggleActive(i)
    {
        const node = this.state.nodes[i]
        var direction = 0
        if( node.state === "active")
        {
            node.state = "inactive"
            direction = 1
        }
        else
        {
            node.state = "active"
            direction = -1
        }
        this.state.inactive += direction
        this.state.active += -direction
        this.setState({
            nodes: this.state.nodes,
            active: this.state.active,
            inactive: this.state.inactive
        })
    }

    transition(node, nextState)
    {
        const nodeRef = this.state.nodes.filter( n => n.id == node)[0]
        switch (nodeRef.stack) {
            case "inactive":
                this.state.inactive--
            case "quiescent":
                this.state.quiescent--
        }

        switch (nextState) {
            case "active":
                this.state.active++
            case "quiescent":
                this.state.quiescent++
        }

        nodeRef.state = nextState

        this.setState({
            nodes: this.state.nodes,
            inactive: this.state.inactive,
            quiescent: this.state.quiescent,
            active: this.state.active
        })
    }


    run()
    {
        d3.json('/run',{
            method:"POST",
            body: JSON.stringify({
                active: this.state.nodes.filter( n => n.state === "active" ).map( n=>n.id),
                edges: this.state.edges.map( e => [e.source.id, e.target.id] )
        }),
        headers: {
        "Content-type": "application/json; charset=UTF-8"
        }
        }).then(json => {

            json.forEach((nList,i) => {
                setTimeout( () => nList.forEach((n) => this.transition(n[0], n[1])), (i+1)*1000)

            })
        })
    }


    updateNetwork()
    {
        var n = replaceNan(parseInt(this.N.value))
        var e = replaceNan(parseInt(this.E.value))
        this.setState({N: n, E: e, inactive: n})
        this.network(n,e)

    }

    async network(n,e)
    {
        console.log("Make call to network")
        //console.log(this.props.N)
        //console.log(this.props.E)
        if(n <= 0 || e <= 0)
            return
        d3.json(`/getNetwork/${n}/${e}`)
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
                //console.log(nodes)
                this.setState({nodes: nodes, edges: edges})
                console.log("network finished")
        })
    }


    render()
    {
        return (
            <div>
                <div className={"row"}>
                <StatsBlock statTitle={"Inactive Users"} value={this.state.inactive}
                            percentage={this.state.N===0 ? 0 : (this.state.inactive/ this.state.N) *100 } />
                <StatsBlock statTitle={"Quiescent Users"} value={this.state.quiescent}
                            percentage={this.state.N===0 ? 0 : (this.state.quiescent/this.state.N) * 100} />
                <StatsBlock statTitle={"Active Users"} value={this.state.active}
                            percentage={this.state.N === 0 ? 0 : (this.state.quiescent/this.state.N) *100} />
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
                                    <button type={"button"}  onClick={this.reset} className={"btn mb-2"} value={"Reset"}>
                                        Reset
                                    </button>
                                </form>
                            </div>
                            <div id={"network"} className={"card-body pt-0"}>
                                <Net ref={node => this.node=node}  onclick={this.toggleActive}
                                     nodes={this.state.nodes}
                                     edges={this.state.edges}
                                />

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