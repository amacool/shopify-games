import { Link, TextField, Checkbox, Button, Select, RadioButton, Stack, Heading, Page } from '@shopify/polaris';
import store from 'store-js';
import Cookies from 'js-cookie';
import '../stylesheets/settings.css';

class Style extends React.Component {
  state = {
      style: '',
      options : [
        {label: 'Color 1', value: '#eae56f'},
        {label: 'Color 2', value: '#89f26e'},
        {label: 'Color 3', value: '#e7706f'},
      ],
      selected: '#eae56f'
    };

  componentDidMount = () => {
    fetch('https://app.trytada.com/getStyle', {
        method: 'POST',
        headers: {
            'Content-type': 'application/json'
        },
        body: JSON.stringify({
            id: Cookies.get('widget_id')
        })
    }).then(resp => resp.json())
    .then(json => {
        if(json.error) {
            console.log('err');
            return;
        }
        var style = json.style;
        this.setState({
            style
        })
        if(style != '#dddddd' && style != '#333333') {
            this.setState({
                selected: style
            })
        }
    })
  }

  render() {
      const { style, options, selected } = this.state;
    return (
      <Page
        title="Visual Style"
      >
        <div className="style-setting">
            <div>
                <Checkbox checked={style == '#dddddd'} label="Clear Theme" onChange={() =>this.changeColor('#dddddd')} />
            </div>
            <div>
                <Checkbox checked={style == '#333333'} label="Dark Theme" onChange={() => this.changeColor('#333333')} />
            </div>
            <Stack horizontal>
                <Checkbox checked={style != '#dddddd' && style != '#333333'} label="Color Theme" onChange={() => this.changeColor('color')} />
                <Select
                    options={options}
                    onChange={this.handleChange}
                    value={selected}
                />
            </Stack>
        </div>
        <Stack horizontal>
            <Button onClick={() => this.prevStep()} >Previous Step</Button>
            <Button primary onClick={() => this.nextStep()}>Next Step</Button>
        </Stack>
    </Page>
    )
  }

  changeColor = (value) => {
      var result = value;
      if(value == '#dddddd' || value == '#333333') {
        this.setState({
            style: value
        })
      } else {
          const {selected} = this.state;
          result = selected;
          this.setState({
              style: selected
          })
      }
      fetch('https://app.trytada.com/updateStyle', {
        method: 'POST',
        headers: {
            'Content-type': 'application/json'
        },
        body: JSON.stringify({
            style: result,
            id: Cookies.get('widget_id')
        })
    });
  }

  handleChange = (value) => {
      if(value == '#dddddd' || value == '#333333') {
          this.setState({
              selected: value
          })
      } else {
          this.setState({
              selected: value,
              style: value
          });
          fetch('https://app.trytada.com/updateStyle', {
              method: 'POST',
              headers: {
                  'Content-type': 'application/json'
              },
              body: JSON.stringify({
                  style: value,
                  id: Cookies.get('widget_id')
              })
          });
      }
  }

  prevStep = () => {
      window.location.href = '/coupons'
  }

  nextStep = () => {
      window.location.href = '/detailSetting';
  }
}

export default Style;