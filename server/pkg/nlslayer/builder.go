package nlslayer

type Builder struct {
	base layerBase
}

func New() *Builder {
	return &Builder{base: layerBase{}}
}

func (b *Builder) Group() *NLSLayerGroupBuilder {
	return NewNLSLayerGroup().base(b.base)
}

func (b *Builder) Simple() *NLSLayerSimpleBuilder {
	return NewNLSLayerSimple().base(b.base)
}

func (b *Builder) ID(id ID) *Builder {
	b.base.IDField = id
	return b
}

func (b *Builder) NewID() *Builder {
	b.base.IDField = NewID()
	return b
}

func (b *Builder) Scene(s SceneID) *Builder {
	b.base.SceneField = s
	return b
}

func (b *Builder) LayerType(t LayerType) *Builder {
	b.base.LayerTypeField = t
	return b
}

func (b *Builder) Infobox(infobox *Infobox) *Builder {
	b.base.InfoboxField = infobox
	return b
}
