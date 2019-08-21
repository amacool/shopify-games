import { Link, TextField, Checkbox, Button, RadioButton, Stack, Heading, Page } from '@shopify/polaris';
import store from 'store-js';
import Cookies from 'js-cookie';
import '../stylesheets/settings.css';

class Coupons extends React.Component {
  state = { discounts: [], value: 0, fixed_type: true };

  componentDidMount = () => {
    fetch('https://app.trytada.com/getDiscounts', {
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
            console.log('error');
            return;
        }
        var discounts = JSON.parse(json);
        this.setState({
            discounts
        })
    })
  }

  render() {
      const { discounts } = this.state;
    return (
      <Page
        title="What discounts do you want to offer?"
      >
        <div className="discount-setting">
            <Checkbox checked={this.state.discounts.freeshipping.enable} label="Free Shipping" onChange={this.changeEnable('freeshipping')} />
            <Checkbox checked={this.state.discounts.discount15p.enable} label="15% Discount" onChange={this.changeEnable('discount15p')} />
            <Checkbox checked={this.state.discounts.discount25p.enable} label="25% Discount" onChange={this.changeEnable('discount25p')} />
            <Button onClick={() => this.nextStep()} primary>Next Step</Button>
        </div>
        <div>
            <TextField value={this.state.value} onChange={this.valueChange()} label="" type="number" />
            <Stack horizontal>
              <RadioButton label="$ Off" id="fixed_amount" name="fixed_amount" onChange={this.handleType(true)} checked={this.state.fixed_type} />
              <RadioButton label="$ Off" id="percentage" name="percentage" onChange={this.handleType(false)} checked={!this.state.fixed_type} />
            </Stack>
            <Button type="button" onClick={() => this.addCoupon()} primary>Add</Button>
        </div>
        <Stack vertical>
            { Object.keys(discounts).map(key => {
                if(key != 'freeshipping' && key != 'discount15p' && key != 'discount25p') {
                    <div>
                        <span>{discount.title}</span>
                        <button onClick={() => this.deleteCoupon(key)} type="button">Delete</button>
                    </div>
                }
            })}
        </Stack>
        <Stack horizontal>
            <Button primary onClick={() => this.nextStep()}>Next Step</Button>
        </Stack>
    </Page>
    )
  }

  handleType = (value) => {
      this.setState({
          fixed_type: value
      });
  }

  valueChange = () => {
      return (value) => {
            this.setState({
                value: value
            })
      }
  }

  nextStep = () => {
      window.location.href = '/style';
  }

  deleteCoupon = (key) =>{
      var {discounts} = this.state;
      delete discounts[key];

      fetch('https://app.trytada.com/updateCoupon', {
          method: 'POST',
          headers: {
              'Content-type': 'application/json'
          },
          body: JSON.stringify({
              discounts,
              id: Cookies.get('widget_id')
          })
      })
      this.setState({
          discounts
      })
  }

  addCoupon = () => {
      const {fixed_type , value} = this.state;
      var {discounts} = this.state;
      var discount = {
            enable: true,
            type: fixed_type?'fixed_amount': 'percentage',
            value: value
      };
      var key = 'discount' + value;
      var title = ' Discount';
      if(fixed_type) {
          key += 'f';
          title = '$' + value + title;
      } else {
          key += 'p'
          title = value + '%' + title;
      }
      discount.title = title;
      discounts[key] = discount;
      fetch('https://app.trytada.com/updateCoupon', {
        method: 'POST',
        headers: {
            'Content-type': 'application/json',
            id: Cookies.get('widget_id')
        },
        body: JSON.stringify({
            discounts
        })
      })
      this.setState({
          discounts,
          fixed_type: true,
          value: 0
      });
  }

  changeEnable = (field) => {
      return (checked) => {
          var {discounts} = this.state;
          discounts[field].enable = checked;
          this.setState({
              discounts: discounts
          });
      }
  }
}

export default Coupons;