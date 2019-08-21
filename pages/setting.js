import { Link, TextField, Checkbox, Button, RadioButton, Stack, Heading, Page } from '@shopify/polaris';
import store from 'store-js';
import Cookies from 'js-cookie';
import '../stylesheets/settings.css';

class Setting extends React.Component {
  state = {
      setting: {},
      targetting: [
        { label: 'All Pages', value: 'allPages' },
        { label: 'All Products', value: 'allProducts' },
        { label: 'All Static Pages', value: 'allStatic' },
        { label: 'All Blogs', value: 'allBlogs' },
        { label: 'Specific Pages', value: 'specific' },
      ]
    };

  componentDidMount = () => {
    fetch('https://app.trytada.com/getSetting', {
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
        var setting = json.setting;
        this.setState({
            setting
        });
    })
  }

  render() {
      const { style, options, selected } = this.state;
    return (
      <Page
        title="Visual Style"
      >
        <div className="style-setting">
            <Checkbox checked={style == '#dddddd'} label="Clear Theme" onChange={this.changeColor('#dddddd')} />
            <Checkbox checked={style == '#333333'} label="Dark Theme" onChange={this.changeColor('#333333')} />
            <Stack horizontal>
                <Checkbox checked={style != '#dddddd' && style != '#333333'} label="Color Theme" onChange={this.changeColor('color')} />
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

  prevStep = () => {
      window.location.href = '/style'
  }

  nextStep = () => {
      window.location.href = '/final';
  }
}

export default Setting;