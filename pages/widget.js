import { Button, Page } from '@shopify/polaris';
import Coupons from './coupons';
import Style from './style';
import DetailSetting from'./detailSetting';
import store from 'store-js';
import Cookies from 'js-cookie';
import '../stylesheets/coupon.css';

class Widget extends React.Component {
    state = {
        discounts: {
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
        styles: {

        },
        detailSetting: {

        },
        selected: 'coupon'
    };

    componentDidMount = () => {
        fetch('https://9a99fd6d.ngrok.io/getSetting', {
            method: 'POST',
            headers: {
                'Content-type': 'application/json'
            },
            body: JSON.stringify({
                id: Cookies.get('widget_id')
            })
        }).then(resp => resp.json())
            .then(json => {
                if (json.error) {
                    console.log('error');
                    return;
                }
                this.setState({
                    discounts: JSON.parse(json.discountType),
                    style: json.style,
                    detailSetting: json
                });
            })

    }

    render() {
        const { discounts, styles, detailSetting, selected } = this.state;
        return (
            <Page
            >
                <div className="settings-header">
                    <div className="settings-header-left">
                        <div className="setting-menu selected" onClick={this.selectTab('coupon')}>1.Coupons Offer</div>
                        <div className="setting-menu" onClick={this.selectTab('style')}>2.Visual Style</div>
                        <div className="setting-menu" onClick={this.selectTab('detail')}>3.Widget Settings</div>
                    </div>
                    <div className="settings-header-right">
                        <Button primary>Preview Widget</Button>
                    </div>
                </div>
                <div className="settings-body">
                    <div className="settings-left">
                        {
                            (selected == 'coupon') ?
                                (<Coupons />):
                                ((selected == 'style')?
                                    (<Style />):(
                                    <DetailSetting />
                                ))
                        }
                        <Coupons discounts={discounts} />
                    </div>
                    <div className="settings-right"></div>
                </div>
            </Page>
        )
    }

    selectTab = (field) => {
        this.setState({
            selected: field
        })
    }
}

export default Widget;
