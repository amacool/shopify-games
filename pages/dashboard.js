import { Popover, ActionList, Button, RadioButton, Stack, Heading, Page } from '@shopify/polaris';
import store from 'store-js';
import Cookies from 'js-cookie';
import '../stylesheets/dashboard.css';

class Dashboard extends React.Component {
  state = { widgets: [], showPopup: false, index: 0 };

  componentDidMount = () => {
    fetch(`https://app.trytada.com/getAllWidgets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        shop: Cookies.get('shopOrigin')
      })
    })
    .then(resp => resp.json())
    .then(json => {
      if(json.error) {
        return;
      }
      if(json) {

        this.setState({
          widgets: json
        });
      }
    });
  }

  render() {
      const { widgets, showPopup, index } = this.state;
console.log(widgets);
    return (
      <Page
        title="Tada Dashboard"
      >
        <Heading>Recent Widgets</Heading>
        <div className="display-setting">
            { (widgets.length == 0)?(
              <div>
                No recent widgets!
              </div>
            ):(
              widgets.map((widget, key) => {
                if(key < 2 ) {
                  const activator = (<div className="dashboard-widget" onClick={() => this.togglePopover(key)}>
                    <div>{widget.type}</div>
                    <div>
                        <h3>{widget.name}</h3>
                        <p>{(widget.pause)?'On Hold':'Active'}</p>
                        <p>Last modified: {widget.created_at}</p>
                    </div>
                  </div>
                  );
                  return (
                    <Popover active={showPopup==true && index == key} activator={activator} onClose={() => this.togglePopover(key)}>
                      <ActionList items={[{content: 'Edit', onAction: () => this.editWidget(key)}, {content: (widget.pause == 1)?'Resume':'Pause', onAction: () => this.pauseWidget(key)}, {content: 'Delete', onAction: () => this.deleteWidget(key)} ]} />
                    </Popover>
                  );
                } else if (key == 2) {
                  return <div className="dashboard-all-widget">
                      <Button>All Widgets</Button>
                    </div>
                }
              })
            )}
        </div>
        <Button onClick={() => this.createNewWidget()} primary>Create New Widget</Button>
    </Page>
    )
  }

  togglePopover = (key) => {
    const {showPopup} = this.state;
    this.setState({
      showPopup: !showPopup,
      index: key
    });
  }

  createNewWidget = () => {
      window.location.href = '/create';
  }

  editWidget = (key) => {
    const {widgets} = this.state;
    Cookies.set('widget_id', widgets[key]._id);
    Cookies.set('tada_game_type', widgets[key].type);
    window.location.href = '/coupons';
  }

  pauseWidget = (key) => {
    var { widgets } = this.state;
    fetch(`https://app.trytada.com/pauseWidget`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        widget_id: widgets[key]._id,
      })
    })
    .then(resp => {
        widgets[key].pause = !widgets[key].pause;
        this.togglePopover(key);
        this.setState({
          widgets: widgets
        });
    });
  }

  deleteWidget = (key) => {
      var widgets = this.state.widgets;
      fetch(`https://app.trytada.com/deleteWidget`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          widget_id: widgets[key]._id,
        })
      })
      .then(resp => {
          this.togglePopover(key);
	  widgets.splice(key, 1);
          this.setState({
            widgets: widgets
          });
      });
  }
}

export default Dashboard;
