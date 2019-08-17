import { Page, Card, Stack, Checkbox } from '@shopify/polaris'
import Cookies from 'js-cookie'

export default class SelectPage extends React.Component {
    constructor(props) {
        super(props)
        this.state = {
            homepage: false,
            products: { allProducts: false },
            blogs: { allBlogs: false },
            pages: { allPages: false },
            cart: false,
            search: false,
            saveDisabled: true,
            shop: Cookies.get('shopOrigin')
        }
    }

    componentDidMount() {
        fetch(`https://app.trytada.com/getPageSetting`, {
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
                this.setState({
                    homepage: setting.homepage,
                    products: setting.products,
                    pages: setting.pages,
                    blogs: setting.blogs,
                    cart: setting.cart,
                    search: setting.search
                })
            });
    }

    render() {
        return (
            <Page
                breadcrumbs={[{content: 'Settings', url: '/?hmac=true'}]}
                title="Select Specific Pages"
                primaryAction={{content: "Save", disabled: this.state.saveDisabled, onAction: this.saveSubSetting}}
                >
                <Card title="Homepage" sectioned>
                    <Stack vertical>
                        <Checkbox label="Select" id="homepage" name="homepage" onChange={this.handleCheck('homepage')} checked={this.state.homepage} />
                    </Stack>
                </Card>
                <Card title="Static Pages" sectioned>
                    <Stack vertical>
                        <Checkbox label="Select All" id="page" name="page" onChange={this.selectAllPage('page')} checked={this.state.pages.allPages} />
                    </Stack>
                    { (Object.keys(this.state.pages).length > 1)?(
                        <Stack>
                            { Object.keys(this.state.pages).forEach(key => {
                                if(key != "allPages") {
                                    return (
                                        <Checkbox label={this.state.pages[key].title} id={key} name={key} onChange={this.selectPage(key)} checked={this.state.pages[key].show} />
                                    );
                                }
                            })}
                        </Stack>
                    ):(null)}
                </Card>
                <Card title="Products Pages" sectioned>
                    <Stack vertical>
                        <Checkbox label="Select All" id="allProducts" name="allProducts" onChange={this.selectAllPage('product')} checked={this.state.products.allProducts} />
                    </Stack>
                    { (Object.keys(this.state.products).length > 1)?(
                        <Stack vertical>
                        { Object.keys(this.state.products).forEach(key => {
                            if(key != "allProducts") {
                                return (
                                    <Checkbox label={this.state.products[key].title} id={key} name={key} onChange={this.selectProduct(key)} checked={this.state.products[key].show} />
                                );
                            }
                        })}
                        </Stack>
                    ):(null)}
                </Card>
                <Card title="Blog Pages" sectioned>
                    <Stack vertical>
                        <Checkbox label="Select All" id="allBlogs" name="allBlogs" onChange={this.selectAllPage('blog')} checked={this.state.blogs.allBlogs} />
                    </Stack>
                    { (Object.keys(this.state.blogs).length > 1)?(
                        <Stack>
                            { Object.keys(this.state.blogs).forEach(key => {
                                if(key != "allBlogs") {
                                    return (
                                        <Checkbox label={this.state.blogs[key].title} id={key} name={key} onChange={this.selectBlog(key)} checked={this.state.blogs[key].show} />
                                    );
                                }
                            })}
                        </Stack>
                    ):(null)}
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

    handleCheck = (field) => {
        return (checked) => {
            this.setState({[field]: checked, saveDisabled: false});
        }
    }

    selectAllPage = (field) => {
        return (checked) => {
            var array = this.state[field];
            Object.keys(array).forEach(function(key) {
                array[key] = checked;
            })

            this.setState({
                [field]: array
            });
        }
    }

    selectPage = (key) => {
        return (checked) => {
            var pages = this.state.pages;
            pages[key].show = checked;
            var allSelected = true;
            Object.keys(pages).forEach(key => {
                if(key != "allPages" && !pages[key].show) {
                    allSelected = false;
                    return;
                }
            });
            pages['allPages'] = allSelected;
            this.setState({
                pages: pages
            })
        }
    }

    selectProduct = (key) => {
        return (checked) => {
            var products = this.state.products;
            products[key].show = checked;
            var allSelected = true;
            Object.keys(products).forEach(key => {
                if(key != "allProducts" && !products[key].show) {
                    allSelected = false;
                    return;
                }
            });
            products['allProducts'] = allSelected;
            this.setState({
                products: products
            })
        }
    }

    selectBlog = (key) => {
        return (checked) => {
            var blogs = this.state.blogs;
            blogs[key].show = checked;
            var allSelected = true;
            Object.keys(blogs).forEach(key => {
                if(key != "allBlogs" && !blogs[key].show) {
                    allSelected = false;
                    return;
                }
            });
            blogs['allBlogs'] = allSelected;
            this.setState({
                blogs: blogs
            })
        }
    }

    saveSubSetting = () => {
        const { homepage, products, pages , blogs, search, cart } = this.state;

        var updateSetting = JSON.stringify({
            homepage, products, pages, blogs, cart, search
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
        });
        this.setState({
            saveDisabled: true
        });
    }
}
