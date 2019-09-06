import { Page, Card, Stack, Checkbox, Collapsible } from '@shopify/polaris'
import Cookies from 'js-cookie'
import { jsUcfirst } from '../utils/util';
import '../stylesheets/select.css';

export default class SelectPage extends React.Component {
    constructor(props) {
        super(props)
        this.state = {
            homepage: false,
            products: { allProducts: false },
            blogs: { allBlogs: false },
            pages: { allPages: false },
            productArray: [],
            pageArray: [],
            blogArray: [],
            blogs: [],
            pages: [],
            cart: false,
            search: false,
            saveDisabled: true,
            id: Cookies.get('widget_id'),
            openBlogs: false,
            openProducts: false,
            openPages: false
        }
    }

    componentDidMount() {
        fetch(`https://0d0d0333.ngrok.io/getPageSetting`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                id: Cookies.get('widget_id')
            })
        })
            .then(resp => resp.json())
            .then(json => {
                if(json == 'error') {
                    console.log('error');
                    return;
                }

                var setting = json.pageSetting;
                this.setState({
                    homepage: setting.homepage,
                    products: setting.products,
                    pages: setting.pages,
                    blogs: setting.blogs,
                    cart: setting.cart,
                    search: setting.search,
                    pageArray: json.pages,
                    blogArray: json.blogs,
                    productArray: json.products
                })
            });
    }

    render() {
        const { products, pages, blogs } = this.state;
        console.log(this.state);
        return (
            <Page
                breadcrumbs={[{content: 'Settings', url: '/detailSetting'}]}
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
                        <Checkbox label="Select All" id="page" name="page" onChange={this.selectAllPage('pages')} checked={this.state.pages.allPages} />
                    </Stack>
                    <div className="see-all" onClick={this.toggleAllPages}>See All</div>
                    { (Object.keys(pages).length > 1 && !this.state.openPages && !this.state.pages.allPages)?(
                        <div>
                            { Object.keys(pages).map(key => {
                                if(key != "allPages") {
                                    return (
                                        <div>
                                            <Checkbox label={pages[key].title} id={key} name={key} onChange={this.selectPage(pages[key], 0)} checked={pages[key] && pages[key].show} />
                                        </div>
                                    );
                                }
                            })}
                        </div>
                    ):(null)}
                    <Collapsible open={this.state.openPages} id="page-collapsible">
                        { this.state.pageArray.map((page, key) => (
                            <div>
                                <Checkbox label={page.title} id={key} name={key} onChange={this.selectPage(page, key)} checked={pages[page.handle] && pages[page.handle].show} />
                            </div>
                        ))}
                    </Collapsible>
                </Card>
                <Card title="Products Pages" sectioned>
                    <Stack vertical>
                        <Checkbox label="Select All" id="allProducts" name="allProducts" onChange={this.selectAllPage('products')} checked={products.allProducts} />
                    </Stack>
                    <div className="see-all" onClick={this.toggleAllProducts}>See All</div>
                    { (Object.keys(products).length > 1 && !this.state.openProducts && !this.state.products.allProducts)?(
                        <div>
                        { Object.keys(products).map(key => {
                            if(key != "allProducts") {
                               return (
                                   <div>
                                        <Checkbox label={products[key].title} id={key} name={key} onChange={this.selectProduct(products[key], 0)} checked={products[key].show} />
                                    </div>
                               );
                          }
                        })}
                        </div>
                    ):(null)}

                    <Collapsible open={this.state.openProducts} id="product-collapsible">
                        { this.state.productArray.map((product, key) => (
                            <div>
                                <Checkbox label={product.title} id={key} name={key} onChange={this.selectProduct(product, key)} checked={products[product.handle] && products[product.handle].show} />
                            </div>
                        ))}
                    </Collapsible>
                </Card>
                <Card title="Blog Pages" sectioned>
                    <Stack vertical>
                        <Checkbox label="Select All" id="allBlogs" name="allBlogs" onChange={this.selectAllPage('blogs')} checked={blogs.allBlogs} />
                    </Stack>
                    <div className="see-all" onClick={this.toggleAllBlogs}>See All</div>
                    { (Object.keys(blogs).length > 1 && !this.state.openBlogs && !this.state.blogs.allBlogs)?(
                        <div>
                            { Object.keys(blogs).map(key => {
                                if(key != "allBlogs") {
                                    return (
                                        <div>
                                            <Checkbox label={blogs[key].title} id={key} name={key} onChange={this.selectBlog(blogs[key], 0)} checked={blogs[key].show} />
                                        </div>
                                    );
                                }
                            })}
                        </div>
                    ):(null)}

                    <Collapsible open={this.state.openBlogs} id="blog-collapsible">
                        { this.state.blogArray.map((blog, key) => (
                            <div>
                                <Checkbox label={blog.title} id={key} name={key} onChange={this.selectBlog(blog, key)} checked={blogs[blog.handle] && blogs[blog.handle].show} />
                            </div>
                        ))}
                    </Collapsible>
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
            if(checked) {
                if(field == 'products') {
                    const products = this.state.productArray;
                    products.map(product => {
                        array[product.handle] = {
                            title: product.title,
                            handle: product.handle,
                            show: true
                        }
                    })
                } else if(field == 'blogs') {
                    const blogs = this.state.blogArray;
                    blogs.map(blog => {
                        array[blog.handle] = {
                            title: blog.title,
                            handle: blog.handle,
                            show: true
                        }
                    });
                } else {
                    const pages = this.state.pageArray;
                    pages.map(page => {
                        array[page.handle] = {
                            title: page.title,
                            handle: page.handle,
                            show: true
                        }
                    })
                }
                array['all'+jsUcfirst(field)] = true;
            } else {
                array = {
                    ['all'+jsUcfirst(field)]: false 
                }
            }

            this.setState({
                [field]: array,
                saveDisabled: false
            });
        }
    }

    toggleAllBlogs = () => {
        const { openBlogs } = this.state;
        this.setState({
            openBlogs: !openBlogs
        })
    }

    toggleAllPages = () => {
        const { openPages } = this.state;
        this.setState({
            openPages: !openPages
        })
    }

    toggleAllProducts = () => {
        const { openProducts } = this.state;
        this.setState({
            openProducts: !openProducts
        })
    }

    selectPage = (page, key) => {
        return (checked) => {
            var pages = this.state.pages;
            var pageArray = this.state.pageArray;
            if(this.state.openPages) {
                if(checked) {
                    if(pages[pageArray[key].handle]) {
                        pages[pageArray[key].handle].show = checked;
                    } else {
                        pages[pageArray[key].handle] = {
                            title: pageArray[key].title,
                            handle: pageArray[key].handle,
                            show: true
                        }
                    }
                } else {
                    if(pages[pageArray[key].handle]) {
                        delete pages[pageArray[key].handle];
                    }
                }
            } else {
                pages[page.handle].show = checked;
            }
            var allSelected = true;
            for(var i=0; i < pageArray.length; i++) {
                const temp = pageArray[i];
                if(!pages[temp.handle] || pages[temp.handle].show != true) {
                    allSelected = false;
                    break;
                }
            }
            pages['allPages'] = allSelected;
            this.setState({
                pages: pages
            })
        }
    }

    selectProduct = (product, key) => {
        return (checked) => {
            var products = this.state.products;
            var productArray = this.state.productArray;
            if(this.state.openProducts) {
                if(checked) {
                    if(products[productArray[key].handle]) {
                        products[productArray[key].handle].show = checked;
                    } else {
                        products[productArray[key].handle] = {
                            title: productArray[key].title,
                            handle: productArray[key].handle,
                            show: true
                        }
                    }
                } else {
                    if(products[productArray[key].handle]) {
                        delete products[productArray[key].handle];
                    }
                }
            } else {
                products[product.handle].show = checked;
            }
            var allSelected = true;
            for(var i=0; i<productArray.length; i++) {
                const temp = productArray[i];
                if(!products[temp.handle] || products[temp.handle].show != true) {
                    allSelected = false;
                    break;
                }
            }
            products['allProducts'] = allSelected;
            this.setState({
                products: products
            })
        }
    }

    selectBlog = (blog, key) => {
        return (checked) => {
            var blogs = this.state.blogs;
            var blogArray = this.state.blogArray;
            if(this.state.openBlogs) {
                if(checked) {
                    if(blogs[blogArray[key].handle]) {
                        blogs[blogArray[key].handle].show = checked;
                    } else {
                        blogs[blogArray[key].handle] = {
                            title: blogArray[key].title,
                            handle: blogArray[key].handle,
                            show: true
                        }
                    }
                } else {
                    if(blogs[blogArray[key].handle]) {
                        delete blogs[blogArray[key].handle];
                    }
                }
            } else {
                blogs[blog.handle].show = checked;
            }
            var allSelected = true;
            for(var i=0; i<blogArray.length; i++) {
                const temp = blogArray[i];
                if(!blogs[temp.handle] || blogs[temp.handle].show != true) {
                    allSelected = false;
                    break;
                }
            }
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

        fetch('https://0d0d0333.ngrok.io/savePageSetting', {
            method: 'POST',
            headers: {
            'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                updateSetting,
                id: Cookies.get('widget_id')
            })
        });
        this.setState({
            saveDisabled: true
        });
    }
}
