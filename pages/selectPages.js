import { Page, Card, Stack, Checkbox } from '@shopify/polaris'

export default class SelectPage extends React.Component {
    constructor(props) {
        super(props)
        this.state = {
            homepage: false,
            allStatic: false,
            allCollections: false,
            allProducts: false,
            allBlogs: false,
            cart: false,
            search: false,
            saveDisabled: false
        }
    }

    render() {
        return (
            <Page
                breadcrumbs={[{content: 'Settings', url: '/'}]}
                title="Select Specific Pages"
                primaryAction={{content: "Save", disabled: this.state.saveDisabled, onAction: this.saveSubSetting}}
                >
                <Card title="Homepage" sectioned>
                    <Stack vertical>
                        <Checkbox label="Select" id="homepage" name="homepage" onChange={this.handleCheck('homepage', false)} checked={this.state.homepage} />
                    </Stack>
                </Card>
                <Card title="Static Pages" sectioned>
                    <Stack vertical>
                        <Checkbox label="Select All" id="allStatic" name="allStatic" onChange={this.handleCheck('static', true)} checked={this.state.allStatic} />
                    </Stack>
                </Card>
                <Card title="Collections Pages" sectioned>
                    <Stack vertical>
                        <Checkbox label="Select All" id="allCollections" name="allCollections" onChange={this.handleCheck('collections', true)} checked={this.state.allCollections} />
                    </Stack>
                </Card>
                <Card title="Products Pages" sectioned>
                    <Stack vertical>
                        <Checkbox label="Select All" id="allProducts" name="allProducts" onChange={this.handleCheck('products', true)} checked={this.state.allProducts} />
                    </Stack>
                </Card>
                <Card title="Blog Pages" sectioned>
                    <Stack vertical>
                        <Checkbox label="Select All" id="allBlogs" name="allBlogs" onChange={this.handleCheck('blogs', true)} checked={this.state.allBlogs} />
                    </Stack>
                </Card>
                <Card title="Cart Page" sectioned>
                    <Stack vertical>
                        <Checkbox label="Select" id="cart" name="cart" onChange={this.handleCheck('cart', false)} checked={this.state.cart} />
                    </Stack>
                </Card>
                <Card title="Search Page" sectioned>
                    <Stack vertical>
                        <Checkbox label="Select" id="search" name="search" onChange={this.handleCheck('search', true)} checked={this.state.search} />
                    </Stack>
                </Card>
            </Page>
        )
    }

    handleCheck = (field, allFlag) => {
        return (checked) => {
            if(allFlag) {

            }

            this.setState({[field]: checked, saveDisabled: false});
        }
    }

    saveSubSetting = () => {

    }
}