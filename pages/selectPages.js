import { Page, Card, Stack, Checkbox } from '@shopify/polaris'
import Cookies from 'js-cookie'

export default class SelectPage extends React.Component {
    constructor(props) {
        super(props)
        this.state = {
            homepage: false,
            allCollections: false,
            allProducts: false,
            allBlogs: false,
            cart: false,
            search: false,
            saveDisabled: true,
            shop: Cookies.get('shopOrigin')
        }
    }

    componentDidMount() {
        fetch(`https://app.trytada.com/getSetting`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                shop: Cookies.get('shopOrigin')
            })
            })
            .then(resp => resp.json())
            .then(json => {
                if(json == 'error') {
                    console.log('error');
                    return;
                }

                var setting = JSON.parse(json.pageSetting);
                console.log(setting);
                this.setState({
                    homepage: setting.homepage,
                    allCollections: setting.allCollections,
                    allProducts: setting.allProducts,
                    allBlogs: setting.allBlogs,
                    cart: setting.cart,
                    search: setting.search
                })
            });
    }

    render() {
        return (
            <Page
                breadcrumbs={[{content: 'Settings', url: '/?hmac=true&shop='+ this.state.shop}]}
                title="Select Specific Pages"
                primaryAction={{content: "Save", disabled: this.state.saveDisabled, onAction: this.saveSubSetting}}
                >
                <Card title="Homepage" sectioned>
                    <Stack vertical>
                        <Checkbox label="Select" id="homepage" name="homepage" onChange={this.handleCheck('homepage')} checked={this.state.homepage} />
                    </Stack>
                </Card>
                <Card title="Collections Pages" sectioned>
                    <Stack vertical>
                        <Checkbox label="Select All" id="allCollections" name="allCollections" onChange={this.handleCheck('allCollections')} checked={this.state.allCollections} />
                    </Stack>
                </Card>
                <Card title="Products Pages" sectioned>
                    <Stack vertical>
                        <Checkbox label="Select All" id="allProducts" name="allProducts" onChange={this.handleCheck('allProducts')} checked={this.state.allProducts} />
                    </Stack>
                </Card>
                <Card title="Blog Pages" sectioned>
                    <Stack vertical>
                        <Checkbox label="Select All" id="allBlogs" name="allBlogs" onChange={this.handleCheck('allBlogs')} checked={this.state.allBlogs} />
                    </Stack>
                </Card>
                <Card title="Cart Page" sectioned>
                    <Stack vertical>
                        <Checkbox label="Select" id="cart" name="cart" onChange={this.handleCheck('cart')} checked={this.state.cart} />
                    </Stack>
                </Card>
                <Card title="Search Page" sectioned>
                    <Stack vertical>
                        <Checkbox label="Select" id="search" name="search" onChange={this.handleCheck('search')} checked={this.state.search} />
                    </Stack>
                </Card>
            </Page>
        )
    }

    handleCheck = (field, allFlag) => {
        return (checked) => {

            this.setState({[field]: checked, saveDisabled: false});
        }
    }

    saveSubSetting = () => {
        const { homepage, allCollections, allProducts, allBlogs, search, cart } = this.state;

        var updateSetting = JSON.stringify({
            homepage, allCollections, allProducts, allBlogs, cart, search
        });

        fetch('https://app.trytada.com/savePageSetting', {
            method: 'POST',
            headers: {
            'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                updateSetting,
                shop: Cookies.get('shopOrigin')
            })
        }).then(resp => resp.json() )
        .then(json => {
		this.setState({
			saveDisabled: true
		});
        });
    }
}
