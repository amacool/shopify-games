import { Button, Page } from '@shopify/polaris';
import Cookies from 'js-cookie';
import Coupons from './coupons';
import Style from './style';
import DetailSetting from './detailSetting';
import '../stylesheets/settings.css';
import '../stylesheets/global.css';

class Setting extends React.Component {
  state = {
      coupons: {
        freeShipping: {
          enable: false
        },
        discount15p: {
            enable: false
        },
        discount25p: {
            enable: false
        }
      },
      style: '',
      detailSetting: {},
      selected: 'coupon'
    };

  componentDidMount = () => {
    fetch('https://9c64a7b6.ngrok.io/getSetting', {
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
            coupons: JSON.parse(setting.discountType),
            style: setting.style,
            detailSetting: setting
        });
    })
  }

  changeSetting = (field) => {
    this.setState({
      selected: field
    })
  }

  gotoPreview = () => {
    window.location.href = '/dashboard';
  }

  render() {
      const { coupons, style, detailSetting, selected } = this.state;
    return (
      <Page>
        <div className="setting-header border-bottom">
          <div className="setting-header-left">
            <div className={(selected=='coupon')?'selected':''}>1.Coupons offer</div>
            <div className={(selected=='style')?'selected':''}>2.Visual Style</div>
            <div className={(selected=='detail')?'selected':''}>3.Widget Settings</div>
          </div>
          <div className="setting-header-right">
            <div className="desktop-icon"></div>
            <div className="mobile-icon"></div>
            <div className="preview-btn">
              <Button primary>Preview Widget</Button>
            </div>
          </div>
        </div>
        <div className="setting-body">
          <div className="setting-options">
            {(selected=='coupon')?(<Coupons coupons={coupons} next={this.changeSetting}/>):(null)}
            {(selected=='style')?(<Style style={style} next={this.changeSetting}/>):(null)}
            {(selected=='detail')?(<DetailSetting detailSetting={detailSetting} finish={this.gotoPreview}/>):(null)}
          </div>
          <div className="setting-preview"></div>
        </div>
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