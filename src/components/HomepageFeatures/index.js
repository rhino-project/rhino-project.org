import React from "react";
import clsx from "clsx";
import styles from "./styles.module.css";

const FeatureList = [
  {
    title: "Deploy in Minutes",
    Svg: require("@site/static/img/undraw_in_no_time_-6-igu.svg").default,
    description: <>Be up and running in just a few short minutes</>,
  },
  {
    title: "Real Code",
    Svg: require("@site/static/img/undraw_programmer_re_owql.svg").default,
    description: (
      <>Build a powerful backend in Rails and a customized front end in React</>
    ),
  },
  {
    title: "Solid foundation",
    Svg: require("@site/static/img/undraw_secure_server_re_8wsq.svg").default,
    description: <>Best practices for testing and deployment.</>,
  },
];

function Feature({ Svg, title, description }) {
  return (
    <div className={clsx("col col--4")}>
      <div className="text--center">
        <Svg className={styles.featureSvg} role="img" />
      </div>
      <div className="text--center padding-horiz--md">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures() {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
