class Example extends React.Component {
  constructor(...args) {
    super(...args);

    this.attachRef = target => this.setState({ target });
    this.state = { show: false };
  }

  render() {
    return (
    <ReactBootstrap.OverlayTrigger
      key={"top"}
      placement={"top"}
      style={{backgroundColor: 'rgba(0, 0, 0, 0.5)'}}
      overlay={
        <ReactBootstrap.Tooltip
            id={`tooltip-top`}

        >
          Tooltip on <strong>Top</strong>.
        </ReactBootstrap.Tooltip>
      }
    >
    <input type={"text"}/>
    </ReactBootstrap.OverlayTrigger>
  )
  }
}


ReactDOM.render(<Example/>, document.getElementById('app-container'))
