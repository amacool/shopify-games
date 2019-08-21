import { Link, TextField, Checkbox, Button, RadioButton, Stack, Heading, Page } from '@shopify/polaris';
import store from 'store-js';
import Cookies from 'js-cookie';
import '../stylesheets/settings.css';

class Create extends React.Component {
  state = { type: 0, name: '', exist: false };

  render() {
    return (
      <Page
        title="Create your first widget"
      >
        <div className="display-setting">
          <Heading>Name of Widget</Heading>
          <TextField value={this.state.name} onChange={this.changeName} type="text" />
          { (this.state.exist)?(
              <div>Already exist!</div>
          ): (null)}
          <Heading>Select type of widget</Heading>
          <Stack horizontal>
              <div className="widget-type">
                  <div>Kind 1</div>
                  <div>Spinning Wheel</div>
                  <Button onClick={() => this.selectWidget(0)} primary>Select Widget</Button>
              </div>
          </Stack>
          <Button onClick={() => this.createNewWidget()} disabled={this.state.saveDisabled} primary>Create Widget</Button>
        </div>
    </Page>
    )
  }

  changeName = () => {
      return (value) => {
          this.setState({
              name: value,
              exist: false
          })
      }
  }

  selectWidget = (type) => {
      this.setState({
          type: type
      });
  }

  createNewWidget = () => {
      const { type, name } = this.state;
      fetch(`https://app.trytada.com/createWidget`, {
          method: 'POST',
          headers: {
              'Content-type': 'application/json'
          },
          body: JSON.stringify({
              type: type,
              name: name
          }).then(resp => resp.json())
          .then(json => {
              if(json.error) {
                  this.setState({
                      exist: true
                  })
              } else {
                  Cookies.set('widget_id', json.id);
                  window.location.href = '/coupons';
              }
          })
      })
  }
}

export default Create;