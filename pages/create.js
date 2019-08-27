import { TextField, Button, InlineError, Page } from '@shopify/polaris';
import store from 'store-js';
import Cookies from 'js-cookie';
import '../stylesheets/create.css';

class Create extends React.Component {
  state = { type: 0, name: '', exist: false, nameError: false };

  render() {
    return (
      <Page title="">
        <div className="create-header border-bottom">
          Create your first widget
        </div>
        <div className="create-card border-bottom">
          <div className="header2">Name of Widget</div>
          <div className="header-description">Lore ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor ut.</div>
          <div className="widget-input">
            <TextField label="" value={this.state.name} onChange={this.changeName} type="text"></TextField>
          </div>
          { (this.state.exist)?(
              <InlineError message="Already exist!" fieldID="existID"></InlineError>
          ): (null)}
          { (this.state.nameError)?(
            <InlineError message="Please input name of widget!" fieldID="emptyID"></InlineError>
          ): (null)}
        </div>
        <div className="widgets-body border-bottom">
          <div className="header2">Select type of widget</div>
          <div className="widgets-group">
            <div className="widget-type">
              <img src="/public/wheel.png" className="widget-img" />
              <div className="header3">SPINNING WHEEL</div>
              <div className="game-badge">Game</div>
              <div>
                <div className="preview-btn">
                  <Button>Preview</Button>
                </div>
                <div className="select-btn">
                  <Button onClick={() => this.selectWidget(0)} primary>Select Widget</Button>
                </div>
              </div>
            </div>
            <div className="widget-type">
              <img src="/public/wheel.png" className="widget-img" />
              <div className="header3">SPINNING WHEEL</div>
              <div className="game-badge">Game</div>
              <div>
                <div className="preview-btn">
                  <Button>Preview</Button>
                </div>
                <div className="select-btn">
                  <Button onClick={() => this.selectWidget(1)} primary>Select Widget</Button>
                </div>
              </div>
            </div>
            <div className="widget-type">
              <img src="/public/wheel.png" className="widget-img" />
              <div className="header3">SPINNING WHEEL</div>
              <div className="game-badge">Pop up</div>
              <div>
                <div className="preview-btn">
                  <Button>Preview</Button>
                </div>
                <div className="select-btn">
                  <Button onClick={() => this.selectWidget(2)} primary>Select Widget</Button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="widget-bottom">
          <Button onClick={() => this.createNewWidget()} primary>Create Widget</Button>
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
              window.location.href = '/setting';
          }
      })
  }
}

export default Create;