import { Checkbox, Button, Select, Stack, Card } from '@shopify/polaris';
import store from 'store-js';
import Cookies from 'js-cookie';
import '../stylesheets/style.css';
import '../stylesheets/global.css';

class Style extends React.Component {
  state = {
      style: '',
      options : [
        {label: 'Dark Skin', value1: '#000000', value2: '#ffffff'},
        {label: 'Tada Skin', value1: '#9a55d6', value2: '#ff5c6d'},
        {label: 'Default Skin', value1: '#f8921f', value2: '#29aae3'},
        {label: '1 Skin', value1: '#9f4141', value2: '#ef8180'},
        {label: '2 Skin', value1: '#9574e9', value2: '#efd895'},
        {label: '3 Skin', value1: '#6dbf91', value2: '#1d672c'},
        {label: '4 Skin', value1: '#ff7d01', value2: '#999999'},
        {label: '5 Skin', value1: '#f0a9af', value2: '#846b89'},
        {label: '6 Skin', value1: '#3c493f', value2: '#b8dad9'},
        {label: '7 Skin', value1: '#e9b9ab', value2: '#967796'},
        {label: '8 Skin', value1: '#0170c1', value2: '#8fe3ee'},
        {label: '9 Skin', value1: '#f59599', value2: '#f26970'}
      ],
      selected: {label: 'Dark Skin', value1: '#000000', value2: '#ffffff'},
      isDropdown: false
    };

    componentWillReceiveProps(props) {
        var style = props.style;
        var selected = {};
        if(style != '#ffffff' && style != '#3333333') {
            const options = this.state.options;
            for(var i=0; i< options.length; i++) {
                if(options[i].value1 == style) {
                    selected = options[i];
                    this.setState({
                        style,
                        selected
                    })
                    break;
                }
            }
        } else {
            this.setState({
                style
            })
        }
    }

  render() {
    const { style, options, selected, isDropdown } = this.state;
    return (
      <div className="style-content">
        <Card>
            <div className="header3">Visual Style</div>
            <div className="default-color">
                <Checkbox checked={style == '#ffffff'} label="Clear Theme" onChange={() =>this.changeColor('#ffffff')} />
            </div>
            <div className="default-color">
                <Checkbox checked={style == '#333333'} label="Dark Theme" onChange={() => this.changeColor('#333333')} />
            </div>
            <div className="default-color">
                <Checkbox checked={style != '#ffffff' && style != '#333333'} label="Color Theme" onChange={() => this.changeColor('color')} />
            </div>
            <div className="color-selector">
                <div className="color-select" onClick={this.showDropdown}>
                    <span className="color-name">{selected.label}</span>
                    <span class="color-select-icon"><span class="Polaris-Icon"><svg viewBox="0 0 20 20" class="Polaris-Icon__Svg" focusable="false" aria-hidden="true"><path d="M13 8l-3-3-3 3h6zm-.1 4L10 14.9 7.1 12h5.8z" fill-rule="evenodd"></path></svg></span></span>
                    <span className="color-pattern" style={{backgroundColor: selected.value2}}></span>
                    <span className="color-pattern" style={{backgroundColor: selected.value1}}></span>
                </div>
                <div className="color-selector-dropdown" style={{display: (isDropdown)?'block':'none'}}>
                    {
                        options.map(option => (
                            <div onClick={() => this.selectColor(option)}>
                                <div className="color-name">
                                    {option.label}
                                </div>
                                <div className="color-pattern" style={{backgroundColor: option.value2}}></div>
                                <div className="color-pattern" style={{backgroundColor: option.value1}}></div>
                            </div>
                        ))
                    }
                </div>
            </div>
        </Card>
        <div className="coupon-bottom">
            <div className="coupon-prev-btn-wrapper">
                <Button onClick={() => this.prevStep()}>Previous Step</Button>
            </div>
            <div className="coupon-next-btn-wrapper">
                <Button primary onClick={() => this.nextStep()}>Next Step</Button>
            </div>
        </div>
    </div>
    )
  }

  selectColor = (option) => {
      const { style } = this.state;
      if(style == '#ffffff' || style == '#333333') {
          this.setState({
              selected: option,
              isDropdown: false
          })
      } else {
          this.setState({
              selected: option,
              style: option.value1,
              isDropdown: false
          })
      }
  }

  showDropdown = () => {
      this.setState({
          isDropdown: !this.state.isDropdown
      })
  }

  changeColor = (value) => {
      var result = value;
      if(value == '#ffffff' || value == '#333333') {
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
      fetch('https://1b4a266b.ngrok.io/updateStyle', {
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
      if(value == '#ffffff' || value == '#333333') {
          this.setState({
              selected: value
          })
      } else {
          this.setState({
              selected: value,
              style: value
          });
          fetch('https://1b4a266b.ngrok.io/updateStyle', {
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
      this.props.next('coupon');
  }

  nextStep = () => {
      this.props.next('detail');
  }
}

export default Style;