import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import './activitypanel.css';
import Feed from './Feed';
import { FeedCommand } from './../utils/const';

class ActivityPanel extends Component {
  render() {
    return (
      <aside className="navigation-feed">
        <header>
          <div className="header-content">
            {this.renderHeaderIcon()}
            <div className="header-title">ACTIVITY FEED</div>
            <div className="header-button">
              <i className="icon-next" />
            </div>
            <div className="header-clear" />
          </div>
        </header>
        <nav>
          {this.renderFeedList(this.props.newFeeds, 'NEW')}
          {this.renderFeedList(this.props.oldFeeds, 'OLDER')}
        </nav>
      </aside>
    );
  }

  componentDidMount() {
    this.props.onLoadFeeds();
  }

  renderFeedList = (feedList, listName) => {
    if (feedList && feedList.size > 0) {
      return (
        <ul className="new-feeds">
          <li className="feed-section-title">
            <p className="text">{listName}</p>
          </li>
          {feedList.map((feed, index) => {
            return (
              <div onClick={() => this.onSelectFeed(feed)}>
                <Link to={`/inbox/${feed.get('threadId')}`}>
                  <Feed
                    key={index}
                    feed={feed}
                    unread={feed.get('unread')}
                    renderIcon={() => this.renderFeedIcon(feed.get('cmd'))}
                  />
                </Link>
              </div>
            );
          })}
        </ul>
      );
    }
    return null;
  };

  onSelectFeed = feed => {
    if (feed.get('unread')) {
      this.props.onSelectFeed(feed.get('id'));
    }
  };

  renderFeedIcon = cmd => {
    switch (cmd) {
      case FeedCommand.SENT:
        return <i className="icon-calendar" />;
      case FeedCommand.EXPIRED:
        return <i className="icon-attach" />;
      case FeedCommand.OPENED:
        return <i className="icon-checked" />;
      default:
        return null;
    }
  };

  renderHeaderIcon = () => {
    return (
      <div className="feed-header-icon">
        <i
          className={'icon-bell ' + this.props.badgeClass}
          data-badge={this.props.badgeData}
        />
      </div>
    );
  };
}

export default ActivityPanel;