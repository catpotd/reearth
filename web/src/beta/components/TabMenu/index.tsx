import { FC, useState, ReactNode } from "react";

import { styled } from "@reearth/services/theme";

interface TabObject {
  icon: string;
  component: ReactNode;
}

type Props = {
  tabs: Record<string, TabObject>;
};
// Work items:
// - Render a more complex component
// - Add props
// - Add icons
// - Based on selected, change icon background color

const TabMenu: FC<Props> = ({ tabs }) => {
  const [selected, setSelected] = useState<TabObject | null>(null);

  return (
    <Wrapper>
      <Title>Inspector</Title>
      <Tabs>
        {Object.entries(tabs).map(([tab, val]) => (
          <div
            style={{
              background: selected && val.icon === selected.icon ? "#232226" : "inherit",
            }}
            key={tab}
            onClick={() => setSelected(val)}>
            {val.icon}
          </div>
        ))}
      </Tabs>
      <MainArea>{selected ? selected.component : null}</MainArea>
    </Wrapper>
  );
};

export default TabMenu;

const Wrapper = styled.div`
  width: 286px;
  display: grid;
  /* outline: solid red; */
  border-radius: 10px;
  margin: 15px;
  grid-template-rows: 36px 1fr;
  grid-template-columns: 28px 1fr;
  height: 600px;
  background: #3f3d45;
`;

const Title = styled.div`
  grid-column: 1/-1;
  align-self: center;
  padding: 0 6px;
  border-radius: 15px 15px 0 0;
`;

const Tabs = styled.div`
  grid-column: 1/2;
  padding: 6px 0;
  background: black;
  cursor: pointer;
`;

const MainArea = styled.div`
  grid-column: 2/-1;
  display: block;
  padding: 6px;
  background: #232226;
`;
