import '../stylesheets/loading.css';

class Loading extends React.Component {
    componentDidMount = () => {

    }

    render() {
        return (
            <div id="loader-container">
                <p id="loadingText">Loading</p>
            </div>
        )
    }
}

export default Loading;