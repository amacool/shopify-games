import { Popover, ActionList, Button, RadioButton, Stack, Heading, Page } from '@shopify/polaris';
import store from 'store-js';
import Cookies from 'js-cookie';
import CanvasJSReact from '../public/canvasjs.react';
var CanvasJSChart = CanvasJSReact.CanvasJSChart;
import DateRangePicker from 'react-bootstrap-daterangepicker';
import 'bootstrap/dist/css/bootstrap.css';
import 'bootstrap-daterangepicker/daterangepicker.css';

import '../stylesheets/dashboard.css';

class Dashboard extends React.Component {
  state = { widgets: [], showPopup: false, index: 0 };

  componentDidMount = () => {
    fetch(`https://app.trytada.com/getDashboardInfo`, {
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
      if(json) {
        console.log(json);
        this.setState({
          widgets: json
        });
      }
    });
  }

  render() {
      const { widgets, showPopup, index } = this.state;
		const options = {
			theme: "light2",
			animationEnabled: true,
			title:{
				text: "Units Sold VS Profit"
			},
			subtitles: [{
				text: "Click Legend to Hide or Unhide Data Series"
			}],
			axisX: {
				title: "States"
			},
			axisY: {
				title: "Units Sold",
				titleFontColor: "#6D78AD",
				lineColor: "#6D78AD",
				labelFontColor: "#6D78AD",
				tickColor: "#6D78AD",
				includeZero: false
			},
			axisY2: {
				title: "Profit in USD",
				titleFontColor: "#51CDA0",
				lineColor: "#51CDA0",
				labelFontColor: "#51CDA0",
				tickColor: "#51CDA0",
				includeZero: false
			},
			toolTip: {
				shared: true
			},
			legend: {
				cursor: "pointer",
				itemclick: this.toggleDataSeries
			},
			data: [{
				type: "spline",
				name: "Units Sold",
				showInLegend: true,
				xValueFormatString: "MMM YYYY",
				yValueFormatString: "#,##0 Units",
				dataPoints: [
					{ x: new Date(2017, 0, 1), y: 120 },
					{ x: new Date(2017, 1, 1), y: 135 },
					{ x: new Date(2017, 2, 1), y: 144 },
					{ x: new Date(2017, 3, 1), y: 103 },
					{ x: new Date(2017, 4, 1), y: 93 },
					{ x: new Date(2017, 5, 1), y: 129 },
					{ x: new Date(2017, 6, 1), y: 143 },
					{ x: new Date(2017, 7, 1), y: 156 },
					{ x: new Date(2017, 8, 1), y: 122 },
					{ x: new Date(2017, 9, 1), y: 106 },
					{ x: new Date(2017, 10, 1), y: 137 },
					{ x: new Date(2017, 11, 1), y: 142 }
				]
			},
			{
				type: "spline",
				name: "Profit",
				axisYType: "secondary",
				showInLegend: true,
				xValueFormatString: "MMM YYYY",
				yValueFormatString: "$#,##0.#",
				dataPoints: [
					{ x: new Date(2017, 0, 1), y: 19034.5 },
					{ x: new Date(2017, 1, 1), y: 20015 },
					{ x: new Date(2017, 2, 1), y: 27342 },
					{ x: new Date(2017, 3, 1), y: 20088 },
					{ x: new Date(2017, 4, 1), y: 20234 },
					{ x: new Date(2017, 5, 1), y: 29034 },
					{ x: new Date(2017, 6, 1), y: 30487 },
					{ x: new Date(2017, 7, 1), y: 32523 },
					{ x: new Date(2017, 8, 1), y: 20234 },
					{ x: new Date(2017, 9, 1), y: 27234 },
					{ x: new Date(2017, 10, 1), y: 33548 },
					{ x: new Date(2017, 11, 1), y: 32534 }
				]
			}]
		}
    return (
      <Page>
        <div className="dashboard-top">

        </div>
        <div className="dashboard-sales">
          <div className="date-select">
            <DateRangePicker startDate="1/1/2014" endDate="3/1/2014">
              <button>Click Me To Open Picker!</button>
            </DateRangePicker>
          </div>
          <div className="dashboard-info">
            <div className="dashboard-info-element">
              <div className="info-values">$2,543</div>
              <div className="info-description">Sales amount using coupons</div>
            </div>
            <div className="dashboard-info-element">
              <div className="info-values">24</div>
              <div className="info-description">Emails</div>
            </div>
            <div className="dashboard-info-element">
              <div className="info-values">12%</div>
              <div className="info-description">Conversion rate from games</div>
            </div>
          </div>
        </div>
        <div className="dashboard-graph">
          <CanvasJSChart options = {options} 
            onRef={ref => this.chart = ref}
            />
        </div>
        <div className="display-setting">
          <div className="dashboard-section-header">Widgets</div>
          <div className="display-create-btn">
            <Button onClick={() => this.createNewWidget()} primary>Create New Widget</Button>
            <div className="display-view-all">View all widgets</div>
          </div>
          <div className="display-widget-group">
            { (widgets.length == 0)?(
              <div>
                No recent widgets!
              </div>
            ):(
              widgets.map((widget, key) => {
                if(key < 3) {
                  return (
                  <div className="dashboard-widget" onClick={() => this.togglePopover(key)}>
                    <div className="widget-img">
                      <img src="/public/wheel-full.png" />
                    </div>
                    <div className="widget-name">
                      <div>{widget.name}</div>
                      <img src="/public/dropdown.png" />
                    </div>
                    <div className="widget-staus">
                      <div className={widget.pause?'hold':'active'}>{(widget.pause)?'On Hold':'Active'}</div>
                      <div className='modify-label'>Last modified: {widget.created_at}</div>
                    </div>
                  </div>
                  );
                }
              })
            )}
          </div>
        </div>
        <div className="dashboard-email-integrate">
          <div classname="dashboard-section-header">Email Integrations & Export</div>
          <div className="dashboard-email-body">
            <div className="dashboard-email-items">
              <div className="email-kind">
                <img src="/public/mailchimp.png" />
                <div>MAILCHIMP</div>
              </div>
              <div className="email-kind">
                <img src="/public/klaviyo.png" />
                <div>KLAVIYO</div>
              </div>
            </div>
            <div className="email-export-section">
              <div className="email-export-description">
                Do you want to work independently with your email list using other Email Service or for other purposes? Export CSV file.
              </div>
              <Button onClick={this.exportCSV} primary>Export CSV</Button>
            </div>
            <div className="email-footer">
              <img src="/public/help.png" />
              <span>Learn more about <a href="#">Email Integration & export</a>.</span>
            </div>
          </div>
        </div>
    </Page>
    )
  }

  togglePopover = (key) => {
    const {showPopup} = this.state;
    this.setState({
      showPopup: !showPopup,
      index: key
    });
  }

  createNewWidget = () => {
      window.location.href = '/create';
  }

  editWidget = (key) => {
    const {widgets} = this.state;
    Cookies.set('widget_id', widgets[key]._id);
    Cookies.set('tada_game_type', widgets[key].type);
    window.location.href = '/coupons';
  }

  pauseWidget = (key) => {
    var { widgets } = this.state;
    fetch(`https://app.trytada.com/pauseWidget`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        widget_id: widgets[key]._id,
      })
    })
    .then(resp => {
        widgets[key].pause = !widgets[key].pause;
        this.togglePopover(key);
        this.setState({
          widgets: widgets
        });
    });
  }

  deleteWidget = (key) => {
      var widgets = this.state.widgets;
      fetch(`https://app.trytada.com/deleteWidget`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          widget_id: widgets[key]._id,
        })
      })
      .then(resp => {
          this.togglePopover(key);
	  widgets.splice(key, 1);
          this.setState({
            widgets: widgets
          });
      });
  }
}

export default Dashboard;
