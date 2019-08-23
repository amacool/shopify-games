import { Link, TextField, Checkbox, Button, RadioButton, Stack, Heading, Page } from '@shopify/polaris';
import store from 'store-js';
import Cookies from 'js-cookie';
import '../stylesheets/settings.css';

class DetailSetting extends React.Component {
  state = { displaySetting: {
    all: false,
    products: {
      allProducts: false
    },
    blogs: {
      allBlogs: false,
    },
    pages: {
      allPages: false,
    },
    specific: false,
  }, timer: 0, frequencyDay: 0, frequencyHour: 0, frequencyMin: 0, showPeriod: false, frequency: '', saveDisabled: true, exitIntent: true, exitIntentTime: 5 };

  componentDidMount = () => {
    fetch(`https://app.trytada.com/getSetting`, {
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
      if(json.error) {
        return;
      }
      if(json) {
        var result = json.setting;
        var frequencyDay = Math.floor(result.displayFrequency/(24*60*60*1000));
        var frequencyHour = Math.floor((result.displayFrequency - frequencyDay * (24* 60 * 60 * 1000))/(60*60*1000));
        var frequencyMin = Math.floor((result.displayFrequency - frequencyDay * (24*60*60) - frequencyHour * (60 * 60 * 1000))/(60 * 1000));
        var showPeriod = false;
        if(result.frequency == 'period') {
          showPeriod = true;
        }

        this.setState({
          displaySetting: JSON.parse(result.pageSetting),
          frequencyDay,
          frequencyHour,
          frequencyMin,
          timer: result.timer,
          frequency: result.frequency,
          showPeriod,
          exitIntent: result.exitIntent,
          exitIntentTime: result.exitIntentTime
        });
      }
    });
  }

  render() {
    return (
      <Page
        title="Settings"
      >
        <div className="display-setting">
          <Heading>Display Setting</Heading>
          <Stack vertical>
            <RadioButton label="All Pages" helpText="App Widget will be displayed on all pages." id="all" name="all" onChange={() => this.handleDisplayChange('all')}  checked={this.state.displaySetting.all}/>
            <RadioButton label="Product Page" helpText="App Widget will be displayed only on product pages" id="products" name="products" onChange={() => this.handleDisplayChange('products')} checked={this.state.displaySetting.products.allProducts} />
            <RadioButton label="Static Page" helpText="App Widget will be displayed only on static pages" id="pages" name="pages" onChange={() => this.handleDisplayChange('pages')} checked={this.state.displaySetting.pages.allPages} />
            <RadioButton label="Blog Page" helpText="App Widget will be displayed only on blogs pages" id="blogs" name="blogs" onChange={() => this.handleDisplayChange('blogs')} checked={this.state.displaySetting.blogs.allBlogs} />
            <RadioButton label="Specific Page" helpText="App Widget will be displayed only on specific pages" id="specific" name="specific" onChange={() => this.handleDisplayChange('specific')} checked={this.state.displaySetting.specific} />
            { (this.state.displaySetting.specific)?(
              <div className="subsetting">
                <Link url="/selectPages">Select Specific Pages</Link>
              </div>
            ):(null) }
          </Stack>

          <TextField value={this.state.timer} onChange={this.timerChange('timer')} label="Timer Value" type="number" />
        </div>
        <div className="frequency-setting">
          <Heading>How often display widget</Heading>
          <Stack vertical>
            <RadioButton label="Every Time" helpText="Game modal will show every time" id="every" name="every" onChange={this.handleFrequency} checked={this.state.frequency === "every"} />
            { (this.state.frequency === "every")?(
                <div className="exit-intent">
                  <Checkbox checked={this.state.exitIntent} label="On Desktop - Only show when visitor are about to exit the page" onChange={this.handleExitIntent} />
                  {(this.state.exitIntent)?(
                    <div>
                      <TextField value={this.state.exitIntentTime} onChange={this.timerChange('exitIntentTime')} label="Period for displaying Exit Intent" type="number" />
                    </div>
                  ):(null)}
                </div>
          ):(null)
            }
            <RadioButton label="One Time" helpText="Game will show only once per user." id="one" name="one" onChange={this.handleFrequency} checked={this.state.frequency === 'one'} />
            { (this.state.frequency === "one")?(
                <div className="exit-intent">
                  <Checkbox checked={this.state.exitIntent} label="On Desktop - Only show when visitor are about to exit the page" onChange={this.handleExitIntent} />
                  {(this.state.exitIntent)?(
                    <div>
                      <TextField value={this.state.exitIntentTime} onChange={this.timerChange('exitIntentTime')} label="Period for displaying Exit Intent" type="number" />
                    </div>
                  ):(null)}
                </div>
          ):(null)
            }
            <RadioButton label="Certain Period" helpText="Game will show in every certain period." id="period" name="period" onChange={this.handleFrequency} checked={this.state.frequency === 'period'} />
            { (this.state.frequency === "period")?(
                <div className="exit-intent">
                  <Checkbox checked={this.state.exitIntent} label="On Desktop - Only show when visitor are about to exit the page" onChange={this.handleExitIntent} />
                  {(this.state.exitIntent)?(
                    <div>
                      <TextField value={this.state.exitIntentTime} onChange={this.timerChange('exitIntentTime')} label="Period for displaying Exit Intent" type="number" />
                    </div>
                  ):(null)}
                </div>
          ):(null)
            }
          </Stack>
          { (this.state.showPeriod)?(
            <Stack horizontal>
              <TextField value={this.state.frequencyDay} onChange={this.timerChange('frequencyDay')} label="Days" type="number" />
              <TextField value={this.state.frequencyHour} onChange={this.timerChange('frequencyHour')} label="Hours" type="number" />
              <TextField value={this.state.frequencyMin} onChange={this.timerChange('frequencyMin')} label="Mins" type="number" />
            </Stack>
          ):(null)}
        </div>
        <div className="page-footer">
          <Button onClick={() => this.prevStep()}>Previous Step</Button>
          <Button onClick={() => this.saveSetting()} primary>Save</Button>
        </div>
      </Page>
    );
  }

  handleDisplayChange = (field) => {
    var {displaySetting} = this.state;
    switch (field) {
      case 'all':
        displaySetting.all = true;
        displaySetting.pages.allPages = false;
        displaySetting.blogs.allBlogs = false;
        displaySetting.products.allProducts = false;
        displaySetting.specific = false;
        break;
      case 'pages':
        displaySetting.all = false;
        displaySetting.pages.allPages = true;
        displaySetting.blogs.allBlogs = false;
        displaySetting.products.allProducts = false;
        displaySetting.specific = false;
        break;
      case 'blogs':
        displaySetting.all = false;
        displaySetting.pages.allPages = false;
        displaySetting.blogs.allBlogs = true;
        displaySetting.products.allProducts = false;
        displaySetting.specific = false;
        break;
      case 'products':
        displaySetting.all = false;
        displaySetting.pages.allPages = false;
        displaySetting.blogs.allBlogs = false;
        displaySetting.products.allProducts = true;
        displaySetting.specific = false;
        break;
      case 'specific':
        displaySetting.all = false;
        displaySetting.pages.allPages = false;
        displaySetting.blogs.allBlogs = false;
        displaySetting.products.allProducts = false;
        displaySetting.specific = true;
        break;
    }

    this.setState({
      displaySetting
    });
  }

  handleExitIntent = (value) => {
    this.setState({ exitIntent: value, saveDisabled: false });
  }

  timerChange = (field) => {
    return (value) => {
      if(value >= 0) this.setState({[field]: value, saveDisabled: false})
    }
  }

  handleFrequency = (checked, newValue) => {
    if(newValue == 'period') {
      this.setState({
        frequency: newValue,
        showPeriod: true,
	      saveDisabled: false
      });
    } else {
      this.setState({
        frequency: newValue,
        showPeriod: false,
	      saveDisabled: false
      });
    }
  }

  saveSetting = () => {
   var { pricingPlan, displaySetting, frequencyDay, frequencyHour, frequencyMin, timer, frequency, exitIntent, exitIntentTime } = this.state;
   var updateSetting = {};
   if(pricingPlan == "free") {
     updateSetting.pricingPlan = 0;
   } else {
     updateSetting.pricingPlan = 1;
   }
   updateSetting.displayFrequency = frequencyDay * 60 * 60 * 24 + frequencyHour * 60 * 60 + frequencyMin * 60;
   updateSetting.displaySetting = JSON.stringify(displaySetting);
   updateSetting.timer = timer;
   updateSetting.frequency = frequency;
   updateSetting.exitIntent = exitIntent;
   updateSetting.exitIntentTime = exitIntentTime;
   fetch(`https://app.trytada.com/saveSetting`, {
     method: 'POST',
     headers: {
       'Content-Type': 'application/json'
     },
     body: JSON.stringify({
       updateSetting,
       shop: Cookies.get('shopOrigin')
    })
   }).then(resp => {
     this.setState({
	    saveDisabled: true
     });
     window.location.href = '/dashboard';
   });
  }

  prevStep = () => {
    window.location.href = '/style';
  }
}

export default DetailSetting;
