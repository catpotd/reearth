package workspace

import (
	"errors"

	"github.com/reearth/reearthx/util"
)

var ErrOperationDenied = errors.New("operation denied")

type Policy struct {
	opts PolicyOption
}

type PolicyOption struct {
	ID                    PolicyID
	ProjectCount          *int
	MemberCount           *int
	PublishedProjectCount *int
	LayerCount            *int
	AssetStorageSize      *int64
}

func NewPolicy(opts PolicyOption) *Policy {
	return &Policy{opts: opts.Clone()}
}

func (p *Policy) ID() PolicyID {
	return p.opts.ID
}

func (p *Policy) Option() PolicyOption {
	return p.opts.Clone()
}

func (p *Policy) EnforceProjectCount(count int) error {
	return p.error(p == nil || p.opts.ProjectCount == nil || *p.opts.ProjectCount > count)
}

func (p *Policy) EnforceMemberCount(count int) error {
	return p.error(p == nil || p.opts.MemberCount == nil || *p.opts.MemberCount > count)
}

func (p *Policy) EnforcePublishedProjectCount(count int) error {
	return p.error(p == nil || p.opts.PublishedProjectCount == nil || *p.opts.PublishedProjectCount > count)
}

func (p *Policy) EnforceLayerCount(count int) error {
	return p.error(p == nil || p.opts.LayerCount == nil || *p.opts.LayerCount > count)
}

func (p *Policy) EnforceAssetStorageSize(size int64) error {
	return p.error(p == nil || p.opts.AssetStorageSize == nil || *p.opts.AssetStorageSize > size)
}

func (*Policy) error(ok bool) error {
	if !ok {
		return ErrOperationDenied
	}
	return nil
}

func (p *Policy) Clone() *Policy {
	if p == nil {
		return nil
	}
	return &Policy{opts: p.opts.Clone()}
}

func (p PolicyOption) Clone() PolicyOption {
	return PolicyOption{
		ID:                    p.ID,
		ProjectCount:          util.CloneRef(p.ProjectCount),
		MemberCount:           util.CloneRef(p.MemberCount),
		PublishedProjectCount: util.CloneRef(p.PublishedProjectCount),
		LayerCount:            util.CloneRef(p.LayerCount),
		AssetStorageSize:      util.CloneRef(p.AssetStorageSize),
	}
}