import { Tabs, Card } from '@shopify/polaris';
// import Coupons from './coupons';
// import Style from './style';
// import DetailSetting from'./detailSetting';
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
        }, value: 0, fixed_type: true, minError: false, maxError: false, minLimit: 1, maxLimit: 12
    };

    componentDidMount = () => {
        // fetch('https://app.trytada.com/getWidget', {
        //     method: 'POST',
        //     headers: {
        //         'Content-type': 'application/json'
        //     },
        //     body: JSON.stringify({
        //         id: Cookies.get('widget_id')
        //     })
        // }).then(resp => resp.json())
        //     .then(json => {
        //         if (json.error) {
        //             console.log('error');
        //             return;
        //         }
        //     })
                
    }

    render() {
        const { discounts, styles, detailSetting, selected } = this.state;
        return (
            <Page
            >
                
            </Page>
        )
    }
}

export default Widget;