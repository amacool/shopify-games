import { Modal, TextContainer, Button, TextField, Page, InlineError } from '@shopify/polaris';
import store from 'store-js';
import Cookies from 'js-cookie';
import moment from 'moment';
import DateRangePicker from 'react-bootstrap-daterangepicker';
import 'bootstrap/dist/css/bootstrap.css';
import 'bootstrap-daterangepicker/daterangepicker.css';
import '../stylesheets/dashboard.css';

class Dashboard extends React.Component {
  state = { widgets: [], showPopup: false, index: 0, conversionRating: 0, totalEmail: 0, totalSales:0, graphData: 0, fromDate: 'Jan 1, 2019', toDate: 'Jan 1, 2022', isDropdown: false, selectedWidget: -1, duplicatedName: '', showDuplicate: false, showDeleteModal: false };

  componentDidMount = () => {
    fetch(`https://04b3238a.ngrok.io/getDashboardInfo`, {
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
          widgets: json.widgets,
          graphData: json.graphData,
          totalEmail: json.totalEmail,
          totalSales: json.totalSales,
          conversionRating: json.conversionRating
        });
      }
    });
  }

  handleDateRange = (event, picker) => {
    if(event.type == "hide" || event.type == 'apply') {
      this.setState({
        fromDate: picker.startDate.format('MMM D, YYYY'),
        toDate: picker.endDate.format('MMM D, YYYY')
      })
    }
  }

  render() {
    const { widgets, showPopup, index, conversionRating, totalEmail, totalSales, graphData, fromDate, toDate } = this.state;
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
            <DateRangePicker startDate={moment(fromDate, 'MMM D, YYYY')} endDate={moment(toDate, 'MMM D, YYYY')} onEvent={this.handleDateRange} autoApply={true}>
              <div className="dashboard-daterange">{fromDate + '-' + toDate}</div>
            </DateRangePicker>
          </div>
          <div className="dashboard-info">
            <div className="dashboard-info-element">
              <div className="info-values">${totalSales}</div>
              <div className="info-description">Sales amount using coupons</div>
            </div>
            <div className="dashboard-info-element">
              <div className="info-values">{totalEmail}</div>
              <div className="info-description">Emails</div>
            </div>
            <div className="dashboard-info-element">
              <div className="info-values">{conversionRating}%</div>
              <div className="info-description">Conversion rate from games</div>
            </div>
          </div>
        </div>
        <div className="dashboard-graph">
        </div>
        <div className="display-setting">
          <div className="dashboard-section-header">Widgets</div>
          <div className="display-create-btn">
            <div className="dashboard-create-btn">
              <Button onClick={() => this.createNewWidget()} primary>Create New Widget</Button>
            </div>
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
                  const created_at = new Date(widget.created_at);
                  return (
                  <div className="dashboard-widget">
                    <div className="widget-img">
                      <img src="/wheel.png" />
                    </div>
                    <div className="widget-name">
                      <div>{widget.name}</div>
                      <img src="/dropdown.png" onClick={() => this.showDropdown(key)}/>
                      {(this.state.isDropdown && this.state.selectedWidget == key)?(
                        <div className="widget-dropdown">
                          <div onClick={() => this.editWidget(key)}><img src="/edit.png"/><span>Edit</span></div>
                          <div onClick={() => this.pauseWidget(key)}><img src="/pause.png"/><span>{(widget.pause)?'Resume':'Pause'}</span></div>
                          <div onClick={() => this.duplicate(key)}><img src="/duplicate.png" /><span>Duplicate & Edit</span></div>
                          <div onClick={() => this.deleteWidgetModal(key)}><img src="/delete.png" /><span style={{color: '#BF0711'}}>Delete</span></div>
                        </div>
                      ):(null)}
                    </div>
                    <div className="widget-status">
                      <div className={widget.pause?'hold':'active'}>{(widget.pause)?'On Hold':'Active'}</div>
                      <div className='modify-label'>Last modified: {created_at.getDate() + '.' + created_at.getUTCMonth() + '.' + created_at.getFullYear()}</div>
                    </div>
                  </div>
                  );
                }
              })
            )}
          </div>
        </div>
        <div className="dashboard-email-integrate">
          <div className="dashboard-section-header">Email Integrations & Export</div>
          <div className="dashboard-email-body">
            <div className="dashboard-email-items">
              <div className="email-kind">
                <img src="/mailchimp.png" />
                <div>MAILCHIMP</div>
              </div>
              <div className="email-kind">
                <img src="/klaviyo.png" />
                <div>KLAVIYO</div>
              </div>
            </div>
            <div className="email-export-section">
              <div className="email-export-description">
                Do you want to work independently with your email list using other Email Service or for other purposes? Export CSV file.
              </div>
              <div className="email-export-btn">
                <Button onClick={this.exportCSV} primary>Export CSV</Button>
              </div>
            </div>
            <div className="email-footer">
              <img src="/help.png" />
              <span>Learn more about <a href="#">Email Integration & export</a>.</span>
            </div>
          </div>
        </div>
        <Modal
          open={this.state.showDuplicate}
          onClose={this.closeDuplicate}
          title="Duplicate Widget"
          primaryAction={{
            content: 'OK',
            onAction: this.gotoSetting
          }}
          secondaryAction={{
            content: 'Cancel',
            onAction: this.closeDuplicate
          }}
          >
          <Modal.Section>
            <TextContainer>
              <p className="error-duplicate">Please input name of duplicated widget!</p>
              <TextField label="" value={this.state.duplicatedName} onChange={this.onChangeDuplicated} />
              {(this.state.nameDuplicatedError)?(
                <InlineError message="Already exist!" fieldID="existID"></InlineError>
              ):(null)}
            </TextContainer>
          </Modal.Section>
        </Modal>
        <Modal
          open={this.state.showDeleteModal}
          onClose={this.closeDeleteModal}
          title="Delete Widget"
          primaryAction={{
            content: 'OK',
            onAction: this.deleteWidget
          }}
          secondaryAction={{
            content: 'Cancel',
            onAction: this.closeDeleteModal
          }}
          >
          <Modal.Section>
            <TextContainer>
              <p className="error-duplicate">Do you want to delete this Widget?</p>
              <p style={{color: '#BF0711', fontSize: '12px'}}>This widget will be permanently deleted and you can not recover this widget in the future!</p>
            </TextContainer>
          </Modal.Section>
        </Modal>
    </Page>
    )
  }

  closeDuplicate = () => {
    this.setState({
      showDuplicate: false,
      duplicatedName: ''
    })
  }

  onChangeDuplicated = (value) => {
    this.setState({
      duplicatedName: value
    })
  }

  gotoSetting = () => {
    const { duplicatedName, widgets } = this.state;
    for(var i=0; i<widgets.length; i++) {
      if(widgets[i].name == duplicatedName) {
        this.setState({
          nameDuplicatedError: true
        })
        return;
      }
    }
    fetch('https://04b3238a.ngrok.io/duplicateWidget', {
      method: 'POST',
      headers: {
        'Content-type': 'application/json',
      },
      body: JSON.stringify({
        widget_id: Cookies.get('widget_id'),
        name: duplicatedName
      })
    }).then(resp => resp.json())
    .then(json => {
      Cookies.set('widget_id', json.id);
      window.location.href = '/setting';
    })
  }

  showDropdown = (key) => {
    const { isDropdown } = this.state;
    if(isDropdown) {
      this.setState({
        isDropdown: false
      })
    } else {
      this.setState({
        isDropdown: true,
        selectedWidget: key
      })
    }
  }

  createNewWidget = () => {
      window.location.href = '/create';
  }

  duplicate = (key) => {
    const { widgets } = this.state;
    Cookies.set('widget_id', widgets[key]._id);
    this.setState({
      showDuplicate: true,
      duplicatedName: '',
      isDropdown: false
    })
  }

  editWidget = (key) => {
    const {widgets} = this.state;
    Cookies.set('widget_id', widgets[key]._id);
    Cookies.set('tada_game_type', widgets[key].type);
    window.location.href = '/setting';
  }

  pauseWidget = (key) => {
    var { widgets } = this.state;
    fetch(`https://04b3238a.ngrok.io/pauseWidget`, {
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
        this.setState({
          widgets: widgets,
          isDropdown: false
        });
    });
  }

  closeDeleteModal = () => {
    this.setState({
      showDeleteModal: false
    })
  }

  deleteWidgetModal = (key) => {
    Cookies.set('delete_index', key);
    this.setState({
      showDeleteModal: true,
      isDropdown: false
    })
  }

  deleteWidget = () => {
    const key = Cookies.get('delete_index');
    var widgets = this.state.widgets;
    fetch(`https://04b3238a.ngrok.io/deleteWidget`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        widget_id: widgets[key]._id
      })
    })
    .then(resp => {
        this.closeDeleteModal();
        widgets.splice(key, 1);
        this.setState({
          widgets: widgets
        });
    });
  }
}

export default Dashboard;
