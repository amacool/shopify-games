import { Link, TextField, Checkbox, Button, RadioButton, Stack, Heading, Page } from '@shopify/polaris';
import store from 'store-js';
import Cookies from 'js-cookie';
import '../stylesheets/coupon.css';

class Coupons extends React.Component {
  state = { discounts: {
      freeShipping: {
          enable: false
      },
      discount15p: {
          enable: false
      },
      discount25p: {
          enable: false
      }
  }, value: 0, fixed_type: true };

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
        var discounts = JSON.parse(json.discounts);
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
            <div>
                <Checkbox checked={this.state.discounts.freeShipping.enable} label="Free Shipping" onChange={this.changeEnable('freeShipping')} />
            </div>
            <div>
                <Checkbox checked={this.state.discounts.discount15p.enable} label="15% Discount" onChange={this.changeEnable('discount15p')} />
            </div>
            <div>
                <Checkbox checked={this.state.discounts.discount25p.enable} label="25% Discount" onChange={this.changeEnable('discount25p')} />
            </div>
        </div>

        <div>
            <TextField value={this.state.value} onChange={this.valueChange} label="" type="number" />
            <Stack horizontal>
              <RadioButton label="$ Off" id="fixed_amount" name="fixed_amount" onChange={() => this.handleType(true)} checked={this.state.fixed_type} />
              <RadioButton label="% Off" id="percentage" name="percentage" onChange={() => this.handleType(false)} checked={!this.state.fixed_type} />
            </Stack>
            <Button type="button" onClick={() => this.addCoupon()} primary>Add</Button>
        </div>
        <Stack vertical>
            { Object.keys(discounts).map(key => {
                if(key != 'freeShipping' && key != 'discount15p' && key != 'discount25p') {
                    return (<div>
                        <span>{discounts[key].title}</span>
                        <button onClick={() => this.deleteCoupon(key)} type="button">Delete</button>
                    </div>)
                }
            })}
        </Stack>
        <div>
            <Button primary onClick={() => this.nextStep()}>Next Step</Button>
        </div>
    </Page>
    )
  }

  handleType = (value) => {
      this.setState({
          fixed_type: value
      });
  }

  valueChange = (value) => {
        this.setState({
            value: value
        })
  }

  nextStep = () => {
    var {discounts} = this.state;

    fetch('https://app.trytada.com/updateCoupon', {
        method: 'POST',
        headers: {
            'Content-type': 'application/json'
        },
        body: JSON.stringify({
            discounts,
            id: Cookies.get('widget_id')
        })
    }).then(resp => {
        window.location.href = '/style';
    })
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
            'Content-type': 'application/json'
        },
        body: JSON.stringify({
            discounts,
            id: Cookies.get('widget_id')
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