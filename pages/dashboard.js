import { Link, TextField, Checkbox, Button, RadioButton, Stack, Heading, Page } from '@shopify/polaris';
import store from 'store-js';
import Cookies from 'js-cookie';
import '../stylesheets/settings.css';

class Dashboard extends React.Component {
  state = { widgets: [] };

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
          widget: json
        });
      }
    });
  }

  render() {
      const { widgets } = this.state;
    return (
      <Page
        title="Tada Dashboard"
      >
        <div className="display-setting">
          <Heading>Recent Widgets</Heading>
          <Stack horizontal>
            { widgets.map(widget => (
                <div className="dashboard-widget">
                    <div>{widget.type}</div>
                    <div>
                        <h3>{widget.name}</h3>
                        <p>{(widget.pause)?'On Hold':'Active'}</p>
                        <p>Last modified: {widget.created_at}</p>
                    </div>
                </div>
            ))}
          </Stack>
          <Button onClick={() => this.createNewWidget()} disabled={this.state.saveDisabled} primary>Save</Button>
        </div>|
    </Page>
    )
  }

  createNewWidget = () => {
      window.location.href = '/create';
  }

  pauseWidget = (widget, key) => {

    fetch(`https://app.trytada.com/pauseWidget`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        widget_id: widget.id,
        pause: pause
      })
    })
    .then(resp => resp.json())
    .then(json => {
      if(json.error) {
        return;
      }
      if(json) {
        var widgets = this.state.widgets;
        widgets[key].pause = !widgets[key].pause
        this.setState({
          widgets: widgets
        });
      }
    });
  }

  deleteWidget = (widget, key) => {
    ch(`https://app.trytada.com/deleteWidget`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          widget_id: widget.id,
        })
      })
      .then(resp => resp.json())
      .then(json => {
        if(json.error) {
          return;
        }
        if(json) {
          var widgets = this.state.widgets;
          delete widgets[key];
          this.setState({
            widgets: widgets
          });
        }
      });
  }
}

export default Dashboard;