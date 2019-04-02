var replaceNan = (x) => isNaN(x)
  ? 0
  : x

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
              <h6 className={"stats-small__value count my-3"}>
                {this.props.value}</h6>
            </div>
            <div className={"stats-small__data"}>
              <span className={"stats-small__percentage stats-small__percentage--increase"}>
                {this.props.percentage.toFixed(2)}
                %
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>);
  }
}

const stateScale = d3.scaleOrdinal().domain(["inactive", "quiescent", "active", "comp"]).range(["#75739F", "#41A368", "#FE9922", "#FE0029"])

class Net extends React.Component {
  constructor(props) {
    super(props)
    this.forceTick = this.forceTick.bind(this)
    this.forceLayout = this.forceLayout.bind(this)

    this.simulation = null //d3.forceSimulation()
    this.state = {
      network_rendered: false
    }
  }

  componentDidMount() {
    console.log("compoentDidMount")
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    if (prevProps.nodes.length != this.props.nodes.length)
      this.simulation = null
    this.forceLayout(this.props.nodes, this.props.edges)
    d3.selectAll('g.node').call(d3.drag().on('drag', (n) => {
      var e = d3.event
      n.fx = e.x
      n.fy = n.y
      if (this.simulation.alpha() < 0.1) {
        this.simulation.alpha(0.1)
        this.simulation.restart()
      }
    }))
  }

  componentWillUnmount() {
    this.simulation.stop()
  }

  forceTick() {
    const node = this.node
    //console.log("forceTick")
    d3.select(node).selectAll("line.link").data(this.props.edges).attr("x1", d => d.source.x).attr("x2", d => d.target.x).attr("y1", d => d.source.y).attr("y2", d => d.target.y)

    d3.select(node).selectAll("g.node").data(this.props.nodes).attr("class", "node").attr("transform", d => `translate(${d.x},${d.y})`)
  }

  forceLayout(nodes, edges) {
    if (nodes.length === 0)
      return
      //        console.log("force layout")
    if (this.simulation === null) {
      var linkForce = d3.forceLink()
      this.simulation = d3.forceSimulation()
          .force("charge", d3.forceManyBody()
              .strength(-30))
          .force("center",
              d3.forceCenter()
                  .x(this.props.width/2)
                  .y(250))
          .force("link", linkForce)
          .nodes(nodes)
          .on('tick', this.forceTick)

      this.simulation.force("link").links(edges)
    } else {
      if (this.simulation.alpha() < 0.1) {
        this.simulation.alpha(0.1)
        this.simulation.restart()
      }
    }

  }

  render() {
    //console.log("net render")
    const nodes = this.props.nodes
    const edges = this.props.edges
    const max_degree = d3.max(nodes.map(node => node.degreeCentrality))
    const circleScale = d3.scaleLinear().domain([0, max_degree]).range([5, 15])
    var nodesHtml = nodes.map((node, i) => <g key={`node_${node.id}`} id={`node_${node.id}`} className={"node"}>
      <circle r={circleScale(node.degreeCentrality)} className={"node"} fill={stateScale(node.state)} stroke={"#9A8B7A"} strokeWidth={1} onClick={() => this.props.onclick(i)}/> {/* <text textAnchor={"middle"} */}
      {/* y={15}> {node.id} </text> */}
    </g>)

    var edgesHtml = edges.map((edge) => <line key={edge.id} id={edge.id} className={"link"} markerEnd={"url(#triangle)"} strokeWidth={edge.weight * 2} opacity={0.5} stroke={"#9A8B7A"} fill={"none"}></line>)

    var refsHtml = <defs>
      <marker key={"triangle"} id={"triangle"} refX={12} refY={6} markerUnits={'userSpaceOnUse'} markerWidth={18} markerHeight={12} orient={"auto"}>
        <path d={'M 0 0 12 6 0 12 3 6'}/>
      </marker>
    </defs>

    //console.log(nodesHtml)
    return <svg ref={node => this.node = node} width={this.props.width} height={this.props.height}>
      {edgesHtml}
      {nodesHtml}
      {refsHtml}no
    </svg>
  }
}

const xypoints = (x_, y_) => {
  var points = []
  for (var i = 0; i < x_.length; i++)
    points.push({x: x_[i], y: y_[i]})
  return points
}

class Trends extends React.Component {
  constructor(props) {
    super(props)
    this.xScale = null
    this.yScale = null
    this.seriesHash = new Map()
    this.colorScale = null
    this.margins = {
      x: 40,
      y: 30
    }
    this.labelMap = {
      "active": "Active",
      "quiescent": "Quiescent",
      "comp": "Act. (competitor)"
    }

  }

  componentDidMount() {
    console.log("Trends DID Mount")
    const nodeSelection = d3.select(this.node)
    nodeSelection.append('text').attr('transform', "translate(250,490)").style('text-anchor', 'middle').text("time-step")
    nodeSelection.append('text').attr('transform', 'translate(10,250) rotate(-90)').style('text-anchor', 'middle').text("# nodes")
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    const nodeSelection = d3.select(this.node)
    nodeSelection.selectAll('path.line').remove()

    var xaxis = d3.axisBottom().scale(this.xScale)
    var yaxis = d3.axisLeft().scale(this.yScale)

    d3.select('#xaxis').attr("font-size", 12).attr("transform", "translate(40,450)").call(xaxis)



    d3.select('#yaxis').attr("transform", "translate(40,30)").call(yaxis)



    this.seriesHash.forEach((v, k, m, i) => {
      var points = xypoints(d3.range(0, v.length), v)
      //console.log(points)
      var line_ = d3.line().x(d => this.margins.x + this.xScale(d.x)).y(d => this.margins.y + this.yScale(d.y)).curve(d3.curveCardinal)

      nodeSelection.append('path').attr("d", line_(points)).attr("class", "line").style("fill", "none").style("stroke", stateScale(k))
    })

    const keys = [...this.seriesHash.keys()]
    const legendSelection = nodeSelection.selectAll('.legend')
    if(legendSelection.length !== keys.length){
        legendSelection.remove()
        keys.forEach((k, i) => {
            nodeSelection.append("circle").attr("cx", 50).attr("cy", 20 * (i + 1)).attr("r", 6).style("fill", stateScale(k)).classed('legend',true)
        nodeSelection.append("text").attr("x", 60).attr("y", 20 * (i + 1)).text(this.labelMap[k]).style("font-size", "15px").attr("alignment-baseline", "middle").classed('legend',true)
        })
    }


  }

  render() {
    this.seriesHash = new Map()
    var yMax = 0
    const data = this.props.data
    data.forEach(d => {
      const name = d.name
      const x = d.x
      const y = d.y

      if (y >= yMax)
        yMax = y

      if (this.seriesHash.get(name) === undefined)
        this.seriesHash.set(name, [])
      this.seriesHash.get(name).push(y)
    })

    //the map is empty
    if (this.seriesHash.keys().next().done)
      var xMax = 1
    else
      var xMax = this.seriesHash.values().next().value.length

    var xRange = [0, xMax]
    var yRange = [yMax, 0]
    //console.log(xRange+" "+yRange)
    this.yScale = d3.scaleLinear().domain(yRange).range([0, 420])
    this.xScale = d3.scaleLinear().domain(xRange).range([0, this.props.width*0.9])

    this.colorScale = d3.scaleOrdinal().domain(["inactive", "quiescent", "active", "comp"]).range(["#75739F", "#41A368", "#FE9922", "#FE0029"])

    //create data points
    var circleHtml = []
    this.seriesHash.forEach((v, k, m) => {
      var circles = v.map((p, i) => <circle r={5} cx={this.margins.x + this.xScale(i)} cy={this.margins.y + this.yScale(p)} fill={stateScale(k)}/>)
      circleHtml = circleHtml.concat(circles)
    })
    console.log(this.props.data)

    return <svg ref={node => this.node = node} height={500} width={this.props.width*0.9}>
      {circleHtml}
      <g key={"yaxis"} id={"yaxis"}></g>
      <g key={"xaxis"} id={"xaxis"}></g>
    </svg>
  }
}

class App extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      N: 0,
      E: 0,
      nodes: [],
      edges: [],
      inactive: 0,
      quiescent: 0,
      active: 0,
      activeComp: 0,
      running: false,
      runnable: false,
      points: [],
      model: 0,
      netWidth: 10,
      trendWidth: 20

    }

    this.updateNetwork = this.updateNetwork.bind(this)
    this.run = this.run.bind(this)
    this.network = this.network.bind(this)
    this.toggleActive = this.toggleActive.bind(this)
    this.transition = this.transition.bind(this)
    this.reset = this.reset.bind(this)
    this.modelSelection = this.modelSelection.bind(this)
    this.onResize = this.onResize.bind(this)
  }

  reset() {
    this.state.nodes.forEach(n => n.state = "inactive")
    this.setState({nodes: this.state.nodes, inactive: this.state.N, quiescent: 0, active: 0, points: []})
  }

  onResize()
  {
    const netWidth = document.getElementById("network-container").clientWidth
    const trendsWidth = document.getElementById('trends-container').clientWidth
    this.setState({netWidth: netWidth, trendWidth: trendsWidth})
  }

  toggleActive(i) {
    console.log("Model: " + this.state.model)
    const node = this.state.nodes[i]
    this.state.points = []
    switch (node.state) {
      case "inactive":
        node.state = "active"
        this.state.inactive -= 1
        this.state.active += 1
        break
      case "active":
        if (this.state.model > 0) {
          //competitive model
          node.state = "comp"
          this.state.active -= 1
          this.state.activeComp += 1
        } else {
          node.state = "inactive"
          this.state.active -= 1
          this.state.inactive += 1
        }
        break
      case "comp":
        // turn to the inactive state
        node.state = "inactive"
        this.state.points.pop()
        this.state.activeComp -= 1
        this.state.inactive += 1
    }

    this.state.points.push({name: "active", x: 0, y: this.state.active})

    if (this.state.model > 0)
      this.state.points.push({name: "comp", x: 0, y: this.state.activeComp})

    this.setState({nodes: this.state.nodes, active: this.state.active, inactive: this.state.inactive, activeComp: this.state.activeComp, points: this.state.points})
  }

  modelSelection(event) {

    this.setState({model: event.target.value})
  }

  transition(node, prevState, nextState) {
    const nodeRef = this.state.nodes.filter(n => n.id == node)[0]
    console.log("node: " + node + " prev:" + prevState + " next: " + nextState)
    switch (prevState) {
      case 'inactive':
        this.state.inactive--
        break
      case 'quiescent':
        this.state.quiescent--
        break
      case 'active':
        this.state.active--
        break
      case 'comp':
        this.state.activeComp--
    }

    switch (nextState) {
      case 'active':
        this.state.active++
        break
      case 'quiescent':
        this.state.quiescent++
        break
      case 'inactive':
        this.state.inactive++
        break
      case 'comp':
        this.state.activeComp++
    }

    nodeRef.state = nextState

    this.setState({nodes: this.state.nodes, inactive: this.state.inactive, quiescent: this.state.quiescent, active: this.state.active, activeComp: this.state.activeComp})
  }

  run() {
    this.setState({running: true})
    d3.json('/run', {
      method: "POST",
      body: JSON.stringify({
        active: this.state.nodes.filter(n => n.state === "active" || n.state === "comp").map(n => [n.id, n.state]),
        edges: this.state.edges.map(e => [e.source.id, e.target.id, e.weight]),
        model: this.state.model
      }),
      headers: {
        "Content-type": "application/json; charset=UTF-8"
      }
    }).then(json => {
      console.log(json)
      json.forEach((nList, i) => {
        if (nList.length === 0) //end of the simulation
          setTimeout(() => this.setState({running: false}), (i + 1) * 1000)
        else
          setTimeout(() => {
            nList.forEach((n) => this.transition(n[0], n[1], n[2]))
            var round = 0
            if (this.state.model > 0)
              round = Math.floor(this.state.points.length / 2)
            else
              round = Math.floor(this.state.points.length / 3)

            this.state.points.push({
              name: 'active',
              y: this.state.active,
              x: round + 1
            })
            this.state.points.push({
              name: 'quiescent',
              y: this.state.quiescent,
              x: round + 1
            })

            if (this.state.model > 0)
              this.state.points.push({
                name: 'comp',
                y: this.state.activeComp,
                x: round + 1
              })

            this.setState({points: this.state.points})
          }, (i + 1) * 1000)
      })

    })
  }

  updateNetwork() {
    var n = replaceNan(parseInt(this.N.value))
    var e = replaceNan(parseInt(this.E.value))
    this.setState({N: n, E: e, inactive: n})
    this.network(n, e)

  }

  async network(n, e) {
    console.log("Make call to network")
    //console.log(this.props.N)
    //console.log(this.props.E)
    if (n <= 0 || e <= 0)
      return
    d3.json(`/getNetwork/${n}/${e}`).then((data) => {
      //console.log(data)
      var nodes = data.nodes
      var edges = data.links
      //console.log(edges)
      const getNodeCentrality = (edges, node) => edges.filter(p => p.source === node.id).length

      const nodeHash = {}
      nodes.forEach(node => {
        nodeHash[node.id] = node
        node.state = "inactive"
        node.degreeCentrality = getNodeCentrality(edges, node)
      })

      edges.forEach(edge => {
        edge.source = nodeHash[edge.source]
        edge.target = nodeHash[edge.target]
        edge.id = edge.source.id + "-" + edge.target.id
      })
      this.setState({nodes: nodes, edges: edges})
      console.log("network finished")
    })
  }

  componentDidMount()
  {
    window.addEventListener('resize', this.onResize, false)
    this.onResize()
  }

  render() {
    return (<div>
      <div className={"row"}>
        <StatsBlock statTitle={"Inactive Users"} value={this.state.inactive} percentage={this.state.N === 0
            ? 0
            : (this.state.inactive / this.state.N) * 100}/>
        <StatsBlock statTitle={"Quiescent Users"} value={this.state.quiescent} percentage={this.state.N === 0
            ? 0
            : (this.state.quiescent / this.state.N) * 100}/>
        <StatsBlock statTitle={"Active Users"} value={this.state.active} percentage={this.state.N === 0
            ? 0
            : (this.state.active / this.state.N) * 100}/> {
          this.state.model > 0 && <StatsBlock statTitle={"Active Users (comp)"} value={this.state.activeComp} percentage={this.state.N == 0
                ? 0
                : (this.state.activeComp / this.state.N) * 100}/>
        }
      </div>
      <div className={"row"}>
        <div className={"col-lg-8 col-md-12 col-sm-12 mb-4"}>
          <div className={"card card-small"}>
            <div className={"card-header border-bottom"}>
              <h6 className={"m-0"}>Network</h6>
            </div>
            <div className="card-body pt-0">
                <div className="row border-bottom py-2 bg-light">

                    <form>
                        <div className={"form-row"}>
                            <div className={"form-group col-md-4"}>
                                <input className={"form-control form-control-sm"} name={"N"} id={"N"} key={"N"}
                                       ref={N => this.N = N}
                                       type={"text"} placeholder={"Enter the number of nodes..."}/>
                            </div>
                            <div className={"form-group col-md-4"}>
                               <input className={"form-control form-control-sm"} name={'E'} id={'E'}
                                       ref={E => this.E = E}
                                       type={"text"} placeholder={"Enter the Number of edges..."}/>
                            </div>
                             <div className={"form-group col-md-4"}>
                              <button type={"button"} onClick={this.updateNetwork} className={"btn"}
                                        disabled={this.state.running} value={"Create Graph"}>
                                    Create Graph
                                </button>
                            </div>
                        </div>
                        <div className={"form-row"}>
                            <div className={"form-group col-md-4"}>
                              <select onChange={this.modelSelection}
                                        className={"form-control custom-select form-control sm-custom-select-sm"}
                                        value={this.state.model}>
                                    <option value={0}>
                                        Non-Competitive
                                    </option>
                                    <option value={1}>
                                        Semi-Progressive
                                    </option>
                                    <option value={2}>
                                        Non-Progressive
                                    </option>
                                </select>
                            </div>

                            <div className={"form-group col-md-4"}>
                               <button type={"button"} onClick={this.run} className={"btn btn-accent"} value={"Run"}
                                        disabled={this.state.running}>
                                    Run
                                </button>
                            </div>

                            <div className={"form-group col-md-4"}>
                                 <button type={"button"} onClick={this.reset} className={"btn"}
                                        disabled={this.state.running}
                                        value={"Reset"}>
                                    Reset
                                </button>
                            </div>
                        </div>
                    </form>

          </div>

            </div>
            <div id={"network-container"} className={"card-body pt-0"}>
              <Net width={this.state.netWidth} height={500} ref={node => this.node = node} onclick={this.toggleActive} nodes={this.state.nodes}
                   edges={this.state.edges}/>

            </div>
          </div>
        </div>
        <div className={"col-lg-4 col-md-6 col-sm-12 mb-4"}>
          <div className={"card card-small"}>
            <div className={"card-header border-bottom"}>
              <h6 className={"m-0"}>Trends</h6>
            </div>

            <div id={"trends-container"} className={"card-body pt-0"}>
              <Trends ref={node => this.node = node} data={this.state.points} width={this.state.trendWidth}/></div>
          </div>
        </div>
      </div>
    </div>)
  }
}

ReactDOM.render(<App/>, document.getElementById('app-container'))