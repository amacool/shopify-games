import { Link, TextField, Checkbox, Button, RadioButton, Stack, Heading, Page } from '@shopify/polaris';
import store from 'store-js';
import Cookies from 'js-cookie';
import '../stylesheets/create.css';

class Create extends React.Component {
  state = { type: 0, name: '', exist: false, nameError: false };

  render() {
    return (
      <Page
        title="Create your first widget"
      >
        <div className="create-card">
          <Heading>Name of Widget</Heading>
          <TextField value={this.state.name} onChange={this.changeName} type="text" />
          { (this.state.exist)?(
              <div>Already exist!</div>
          ): (null)}
          { (this.state.nameError)?(
            <div>Please input name of widget!</div>
        ): (null)}
          <div className="widgets-group">
          <Heading>Select type of widget</Heading>
            <div className="widget-type">
                <div>Kind 1</div>
                <div>Spinning Wheel</div>
                <Button onClick={() => this.selectWidget(0)} primary>Select Widget</Button>
            </div>
          </div>
          <div>
            <button className="create-widget-btn" onClick={() => this.createNewWidget()}>Create Widget</button>
          </div>
        </div>
    </Page>
    )
  }

  changeName = (value) => {
    this.setState({
        name: value,
        exist: false,
        nameError: false
    })
  }

  selectWidget = (type) => {
      this.setState({
          type: type
      });
  }

  createNewWidget = () => {
      const { type, name } = this.state;
      if(name == '') {
          this.setState({
              nameError: true
          });
          return;
      }
      fetch(`https://app.trytada.com/createWidget`, {
          method: 'POST',
          headers: {
              'Content-type': 'application/json'
          },
          body: JSON.stringify({
              type: type,
              name: name,
              shop: Cookies.get('shopOrigin')
          })
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
  }
}

export default Create;